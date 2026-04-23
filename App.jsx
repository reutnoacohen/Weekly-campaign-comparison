import { useCallback, useMemo, useState } from 'react'
import Header from './components/Header.jsx'
import FileUploadSection from './components/FileUploadSection.jsx'
import SummaryCards from './components/SummaryCards.jsx'
import FiltersBar from './components/FiltersBar.jsx'
import CampaignSummaryTable from './components/CampaignSummaryTable.jsx'
import BreakdownTable from './components/BreakdownTable.jsx'
import CampaignInsightsSummary from './components/CampaignInsightsSummary.jsx'
import {
  mapRawRows,
  TARGET_FIELDS,
  autoDetectMapping,
  isCompareReady,
  DEFAULT_PAYABLE_CONFIG,
} from './utils/mapColumns.js'
import {
  applyPayableBaselineToMappedRows,
  isBaselineKpiEnabled,
} from './utils/applyPayableBaseline.js'
import { normalizeDataset } from './utils/normalizeData.js'
import { aggregateByKey } from './utils/aggregateCampaignData.js'
import { compareAggregates, STATUS } from './utils/compareRows.js'
import { summarizeCampaignResults } from './utils/summarizeResults.js'
import { parseUploadedFile } from './utils/parseCsvFile.js'
import { BREAKDOWN_OPTIONS } from './utils/buildComparisonKey.js'
import { exportRowsToCsv } from './utils/exportComparisonCsv.js'
import { buildCampaignInsightsSummaries } from './utils/buildCampaignInsightsSummary.js'
import { applyGeoFilter, uniqueSortedGeoValues } from './utils/geoFilters.js'
import { buildAggregateEventsNarrative, formatEventChangeCsv } from './utils/kpiDisplay.js'
import { MOCK_PREV, MOCK_CURR } from './data/mockNormalizedRows.js'

const DEFAULT_FILTERS = {
  campaignName: '',
  mediaSource: '',
  agency: '',
  attributionType: '',
  status: 'all',
  country: [],
  state: [],
  /** When true, country/state selections restrict rows; when false, ignore geo selections */
  useGeo: true,
}

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  ...Object.values(STATUS).map((s) => ({ value: s, label: s })),
]

function identityMapping() {
  return Object.fromEntries(TARGET_FIELDS.map((f) => [f, f]))
}

function hasPayableKpiFlag(prevMap, currMap, prevCfg, currCfg) {
  return (
    Boolean(prevMap?.payableEventCount || currMap?.payableEventCount) ||
    isBaselineKpiEnabled(prevMap, prevCfg ?? DEFAULT_PAYABLE_CONFIG) ||
    isBaselineKpiEnabled(currMap, currCfg ?? DEFAULT_PAYABLE_CONFIG)
  )
}

function passesFilters(row, filters, mode) {
  const sub = (field, value) => {
    if (!value) return true
    return String(field ?? '')
      .toLowerCase()
      .includes(value.toLowerCase())
  }
  if (!sub(row.display.campaign, filters.campaignName)) return false
  if (mode === 'breakdown') {
    if (!sub(row.display.mediaSource, filters.mediaSource)) return false
    if (!sub(row.display.agency, filters.agency)) return false
  }
  if (filters.attributionType) {
    if (
      !sub(row.display.attributionType, filters.attributionType) &&
      !sub(row.display.eventName, filters.attributionType)
    ) {
      return false
    }
  }
  if (filters.status !== 'all' && row.status !== filters.status) return false
  return true
}

export default function App() {
  const [prevFileState, setPrevFileState] = useState(null)
  const [currFileState, setCurrFileState] = useState(null)
  const [dataset, setDataset] = useState(null)
  const [breakdownLevel, setBreakdownLevel] = useState('campaign_media')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handlePrevFile = useCallback(async (file) => {
    setError('')
    if (!file) {
      setPrevFileState(null)
      return
    }
    try {
      const parsed = await parseUploadedFile(file)
      const { mapping, needsManual } = autoDetectMapping(parsed.headers, parsed.rows)
      setPrevFileState({
        fileName: file.name,
        headers: parsed.headers,
        rows: parsed.rows,
        mapping,
        needsManual,
        payableConfig: { ...DEFAULT_PAYABLE_CONFIG },
        ready: isCompareReady(mapping, parsed.rows, DEFAULT_PAYABLE_CONFIG),
      })
    } catch (e) {
      setError(e?.message || 'Could not parse previous week file.')
      setPrevFileState(null)
    }
  }, [])

  const handleCurrFile = useCallback(async (file) => {
    setError('')
    if (!file) {
      setCurrFileState(null)
      return
    }
    try {
      const parsed = await parseUploadedFile(file)
      const { mapping, needsManual } = autoDetectMapping(parsed.headers, parsed.rows)
      setCurrFileState({
        fileName: file.name,
        headers: parsed.headers,
        rows: parsed.rows,
        mapping,
        needsManual,
        payableConfig: { ...DEFAULT_PAYABLE_CONFIG },
        ready: isCompareReady(mapping, parsed.rows, DEFAULT_PAYABLE_CONFIG),
      })
    } catch (e) {
      setError(e?.message || 'Could not parse current week file.')
      setCurrFileState(null)
    }
  }, [])

  const onPrevMapping = useCallback((mapping) => {
    setPrevFileState((s) =>
      s
        ? {
            ...s,
            mapping,
            ready: isCompareReady(
              mapping,
              s.rows,
              s.payableConfig ?? DEFAULT_PAYABLE_CONFIG,
            ),
          }
        : s,
    )
  }, [])

  const onCurrMapping = useCallback((mapping) => {
    setCurrFileState((s) =>
      s
        ? {
            ...s,
            mapping,
            ready: isCompareReady(
              mapping,
              s.rows,
              s.payableConfig ?? DEFAULT_PAYABLE_CONFIG,
            ),
          }
        : s,
    )
  }, [])

  const onPrevPayableConfig = useCallback((payableConfig) => {
    setPrevFileState((s) =>
      s
        ? {
            ...s,
            payableConfig,
            ready: isCompareReady(
              s.mapping,
              s.rows,
              payableConfig,
            ),
          }
        : s,
    )
  }, [])

  const onCurrPayableConfig = useCallback((payableConfig) => {
    setCurrFileState((s) =>
      s
        ? {
            ...s,
            payableConfig,
            ready: isCompareReady(
              s.mapping,
              s.rows,
              payableConfig,
            ),
          }
        : s,
    )
  }, [])

  const runComparison = useCallback(() => {
    if (!prevFileState?.ready || !currFileState?.ready) return
    setBusy(true)
    try {
      const pCfg = prevFileState.payableConfig ?? DEFAULT_PAYABLE_CONFIG
      const cCfg = currFileState.payableConfig ?? DEFAULT_PAYABLE_CONFIG
      const mappedPrev = mapRawRows(prevFileState.rows, prevFileState.mapping)
      const mappedCurr = mapRawRows(currFileState.rows, currFileState.mapping)
      const withPayPrev = applyPayableBaselineToMappedRows(
        mappedPrev,
        prevFileState.mapping,
        pCfg,
      )
      const withPayCurr = applyPayableBaselineToMappedRows(
        mappedCurr,
        currFileState.mapping,
        cCfg,
      )
      const normPrev = normalizeDataset(withPayPrev)
      const normCurr = normalizeDataset(withPayCurr)
      const usesPayableBaseline =
        isBaselineKpiEnabled(prevFileState.mapping, pCfg) ||
        isBaselineKpiEnabled(currFileState.mapping, cCfg)
      setDataset({
        normPrev,
        normCurr,
        hasPayableColumn: hasPayableKpiFlag(
          prevFileState.mapping,
          currFileState.mapping,
          pCfg,
          cCfg,
        ),
        usesPayableBaseline,
      })
      setFilters(DEFAULT_FILTERS)
    } catch (e) {
      setError(e?.message || 'Comparison failed.')
    } finally {
      setBusy(false)
    }
  }, [prevFileState, currFileState])

  const loadMock = useCallback(() => {
    const mapping = identityMapping()
    setPrevFileState({
      fileName: 'mock-previous.csv',
      headers: TARGET_FIELDS,
      rows: MOCK_PREV,
      mapping,
      needsManual: false,
      payableConfig: { ...DEFAULT_PAYABLE_CONFIG },
      ready: isCompareReady(mapping, MOCK_PREV, DEFAULT_PAYABLE_CONFIG),
    })
    setCurrFileState({
      fileName: 'mock-current.csv',
      headers: TARGET_FIELDS,
      rows: MOCK_CURR,
      mapping,
      needsManual: false,
      payableConfig: { ...DEFAULT_PAYABLE_CONFIG },
      ready: isCompareReady(mapping, MOCK_CURR, DEFAULT_PAYABLE_CONFIG),
    })
    setError('')
    const pCfg = DEFAULT_PAYABLE_CONFIG
    const withPrev = applyPayableBaselineToMappedRows(
      mapRawRows(MOCK_PREV, mapping),
      mapping,
      pCfg,
    )
    const withCurr = applyPayableBaselineToMappedRows(
      mapRawRows(MOCK_CURR, mapping),
      mapping,
      pCfg,
    )
    const normPrev = normalizeDataset(withPrev)
    const normCurr = normalizeDataset(withCurr)
    setDataset({
      normPrev,
      normCurr,
      hasPayableColumn: hasPayableKpiFlag(mapping, mapping, pCfg, pCfg),
      usesPayableBaseline: false,
    })
    setFilters(DEFAULT_FILTERS)
  }, [])

  const normPrevGeo = useMemo(
    () => (dataset?.normPrev ? applyGeoFilter(dataset.normPrev, filters) : []),
    [dataset?.normPrev, filters.country, filters.state, filters.useGeo],
  )

  const normCurrGeo = useMemo(
    () => (dataset?.normCurr ? applyGeoFilter(dataset.normCurr, filters) : []),
    [dataset?.normCurr, filters.country, filters.state, filters.useGeo],
  )

  const campaignRows = useMemo(() => {
    if (!dataset) return []
    const prev = aggregateByKey(normPrevGeo, 'campaign')
    const curr = aggregateByKey(normCurrGeo, 'campaign')
    return compareAggregates(prev, curr, {
      level: 'campaign',
      hasPayableColumn: dataset.hasPayableColumn,
    })
  }, [dataset, normPrevGeo, normCurrGeo])

  const mediaRows = useMemo(() => {
    if (!dataset) return []
    const prev = aggregateByKey(normPrevGeo, 'campaign_media')
    const curr = aggregateByKey(normCurrGeo, 'campaign_media')
    return compareAggregates(prev, curr, {
      level: 'campaign_media',
      hasPayableColumn: dataset.hasPayableColumn,
    })
  }, [dataset, normPrevGeo, normCurrGeo])

  const mediaDetailRows = useMemo(() => {
    if (!dataset) return []
    const prev = aggregateByKey(normPrevGeo, 'campaign_media_detail')
    const curr = aggregateByKey(normCurrGeo, 'campaign_media_detail')
    return compareAggregates(prev, curr, {
      level: 'campaign_media_detail',
      hasPayableColumn: dataset.hasPayableColumn,
    })
  }, [dataset, normPrevGeo, normCurrGeo])

  const breakdownRows = useMemo(() => {
    if (!dataset || !breakdownLevel) return []
    const prev = aggregateByKey(normPrevGeo, breakdownLevel)
    const curr = aggregateByKey(normCurrGeo, breakdownLevel)
    return compareAggregates(prev, curr, {
      level: breakdownLevel,
      hasPayableColumn: dataset.hasPayableColumn,
    })
  }, [dataset, breakdownLevel, normPrevGeo, normCurrGeo])

  const geoFilterMeta = useMemo(() => {
    if (!dataset?.normPrev && !dataset?.normCurr) {
      return {
        countryOptions: [],
        stateOptions: [],
        showCountryFilter: false,
        showStateFilter: false,
      }
    }
    const allPrev = dataset.normPrev || []
    const allCurr = dataset.normCurr || []
    const countryOptions = uniqueSortedGeoValues(
      [...allPrev, ...allCurr],
      'country',
    )
    const stateOptions = uniqueSortedGeoValues(
      [...allPrev, ...allCurr],
      'state',
    )
    const prevMap = prevFileState?.mapping
    const currMap = currFileState?.mapping
    const mappedCountry = Boolean(prevMap?.country || currMap?.country)
    const mappedState = Boolean(prevMap?.state || currMap?.state)
    return {
      countryOptions,
      stateOptions,
      showCountryFilter: mappedCountry || countryOptions.length > 0,
      showStateFilter: mappedState || stateOptions.length > 0,
    }
  }, [dataset?.normPrev, dataset?.normCurr, prevFileState?.mapping, currFileState?.mapping])

  const filteredCampaignRows = useMemo(() => {
    return campaignRows.filter((r) => passesFilters(r, filters, 'campaign'))
  }, [campaignRows, filters])

  const filteredBreakdownRows = useMemo(() => {
    return breakdownRows.filter((r) => passesFilters(r, filters, 'breakdown'))
  }, [breakdownRows, filters])

  const summary = useMemo(() => {
    if (!dataset) {
      return {
        improving: 0,
        declining: 0,
        stable: 0,
        noPayable: 0,
        newSources: 0,
        missingSources: 0,
      }
    }
    const campFiltered = campaignRows.filter((r) =>
      passesFilters(r, filters, 'campaign'),
    )
    const mediaFiltered = mediaRows.filter((r) =>
      passesFilters(r, filters, 'breakdown'),
    )
    return summarizeCampaignResults(campFiltered, mediaFiltered)
  }, [dataset, campaignRows, mediaRows, filters])

  const kpiNarrative = useMemo(() => {
    if (!dataset) return ''
    const camp = campaignRows.filter((r) =>
      passesFilters(r, filters, 'campaign'),
    )
    const med = mediaRows.filter((r) =>
      passesFilters(r, filters, 'breakdown'),
    )
    if (!camp.length) return ''
    return buildAggregateEventsNarrative(camp, med)
  }, [dataset, campaignRows, mediaRows, filters])

  const campaignInsightsSummaries = useMemo(() => {
    if (!filteredCampaignRows.length) return []
    const mediaFiltered = mediaRows.filter((r) =>
      passesFilters(r, filters, 'breakdown'),
    )
    const hasSubSourceColumn = Boolean(
      prevFileState?.mapping?.sourceDetail || currFileState?.mapping?.sourceDetail,
    )
    const detailFiltered = hasSubSourceColumn
      ? mediaDetailRows.filter((r) => passesFilters(r, filters, 'breakdown'))
      : []
    return buildCampaignInsightsSummaries(
      filteredCampaignRows,
      mediaFiltered,
      detailFiltered,
    )
  }, [
    mediaRows,
    mediaDetailRows,
    filteredCampaignRows,
    filters,
    prevFileState?.mapping?.sourceDetail,
    currFileState?.mapping?.sourceDetail,
  ])

  const exportCampaign = () => {
    if (!filteredCampaignRows.length) return
    exportRowsToCsv('campaign-comparison.csv', CAMP_COLS, filteredCampaignRows)
  }

  const exportBreakdown = () => {
    if (!filteredBreakdownRows.length) return
    exportRowsToCsv('breakdown-comparison.csv', BR_COLS(breakdownLevel), filteredBreakdownRows)
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Header />
      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8 text-left">
        <FileUploadSection
          prevState={prevFileState}
          currState={currFileState}
          onPrevFile={handlePrevFile}
          onCurrFile={handleCurrFile}
          onPrevMapping={onPrevMapping}
          onCurrMapping={onCurrMapping}
          onPrevPayableConfig={onPrevPayableConfig}
          onCurrPayableConfig={onCurrPayableConfig}
          onCompare={runComparison}
          onLoadMock={loadMock}
          comparing={busy}
        />

        {error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {error}
          </div>
        )}

        {dataset && (
          <>
            {dataset.usesPayableBaseline && (
              <div className="rounded-md border border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-950">
                Payable events are calculated using baseline logic
              </div>
            )}

            <FiltersBar
              filters={filters}
              onChange={setFilters}
              statusOptions={STATUS_FILTER_OPTIONS}
              breakdownValue={breakdownLevel}
              onBreakdownChange={setBreakdownLevel}
              breakdownOptions={BREAKDOWN_OPTIONS}
              countryOptions={geoFilterMeta.countryOptions}
              stateOptions={geoFilterMeta.stateOptions}
              showCountryFilter={geoFilterMeta.showCountryFilter}
              showStateFilter={geoFilterMeta.showStateFilter}
            />

            <SummaryCards
              summary={summary}
              narrative={kpiNarrative}
              usesPayableBaseline={dataset.usesPayableBaseline}
              hasPayableKpi={dataset.hasPayableColumn}
            />

            <CampaignInsightsSummary
              summaries={campaignInsightsSummaries}
              usesPayableBaseline={dataset.usesPayableBaseline}
              hasPayableKpi={dataset.hasPayableColumn}
            />

            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Campaign summary
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Each row compares <span className="font-medium">events</span> between weeks (same
                    definition as the KPI line above).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={exportCampaign}
                  disabled={!filteredCampaignRows.length}
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  Export CSV
                </button>
              </div>
              <CampaignSummaryTable
                rows={filteredCampaignRows}
                hasPayableColumn={dataset.hasPayableColumn}
                usesPayableBaseline={dataset.usesPayableBaseline}
              />
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div />
              <button
                type="button"
                onClick={exportBreakdown}
                disabled={!filteredBreakdownRows.length}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
              >
                Export breakdown CSV
              </button>
            </div>
            <BreakdownTable
              rows={filteredBreakdownRows}
              breakdownLevel={breakdownLevel}
              hasPayableColumn={dataset.hasPayableColumn}
              usesPayableBaseline={dataset.usesPayableBaseline}
            />
          </>
        )}
      </main>
    </div>
  )
}

const CAMP_COLS = [
  { header: 'Campaign', accessor: (r) => r.display.campaign },
  {
    header: 'Events (week over week)',
    accessor: (r) => formatEventChangeCsv(r.prevPayable, r.currPayable),
  },
  { header: 'Event rate previous week', accessor: (r) => r.prevRate },
  { header: 'Event rate current week', accessor: (r) => r.currRate },
  { header: 'Status', accessor: (r) => r.status },
  { header: 'Insight', accessor: (r) => r.insight },
]

function BR_COLS(level) {
  return [
    { header: 'Campaign', accessor: (r) => r.display.campaign },
    { header: 'Source / detail', accessor: (r) => detailCell(level, r) },
    {
      header: 'Events (week over week)',
      accessor: (r) => formatEventChangeCsv(r.prevPayable, r.currPayable),
    },
    { header: 'Event rate previous week', accessor: (r) => r.prevRate },
    { header: 'Event rate current week', accessor: (r) => r.currRate },
    { header: 'Status', accessor: (r) => r.status },
    { header: 'Insight', accessor: (r) => r.insight },
  ]
}

function detailCell(level, row) {
  if (level === 'campaign') return ''
  if (level === 'campaign_media') return row.display.mediaSource
  if (level === 'campaign_media_detail') {
    return [row.display.mediaSource, row.display.sourceDetail].filter(Boolean).join(' | ')
  }
  if (level === 'campaign_media_agency') {
    return [row.display.mediaSource, row.display.agency].filter(Boolean).join(' | ')
  }
  if (level === 'campaign_attribution') return row.display.attributionType
  if (level === 'campaign_event') return row.display.eventName
  return ''
}
