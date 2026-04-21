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
  isMappingReady,
} from './utils/mapColumns.js'
import { normalizeDataset } from './utils/normalizeData.js'
import { aggregateByKey } from './utils/aggregateCampaignData.js'
import { compareAggregates, STATUS } from './utils/compareRows.js'
import { summarizeCampaignResults } from './utils/summarizeResults.js'
import { parseUploadedFile } from './utils/parseCsvFile.js'
import { BREAKDOWN_OPTIONS } from './utils/buildComparisonKey.js'
import { exportRowsToCsv } from './utils/exportComparisonCsv.js'
import { buildCampaignInsightsSummaries } from './utils/buildCampaignInsightsSummary.js'
import { MOCK_PREV, MOCK_CURR } from './data/mockNormalizedRows.js'

const DEFAULT_FILTERS = {
  campaignName: '',
  mediaSource: '',
  agency: '',
  attributionType: '',
  status: 'all',
}

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  ...Object.values(STATUS).map((s) => ({ value: s, label: s })),
]

function identityMapping() {
  return Object.fromEntries(TARGET_FIELDS.map((f) => [f, f]))
}

function mapDataset(normPrev, normCurr, prevMapPayable, currMapPayable) {
  const hasPayableColumn = Boolean(prevMapPayable || currMapPayable)
  const campaignPrev = aggregateByKey(normPrev, 'campaign')
  const campaignCurr = aggregateByKey(normCurr, 'campaign')
  const campaignRows = compareAggregates(campaignPrev, campaignCurr, {
    level: 'campaign',
    hasPayableColumn,
  })

  const mediaPrev = aggregateByKey(normPrev, 'campaign_media')
  const mediaCurr = aggregateByKey(normCurr, 'campaign_media')
  const mediaRows = compareAggregates(mediaPrev, mediaCurr, {
    level: 'campaign_media',
    hasPayableColumn,
  })

  return { campaignRows, mediaRows, hasPayableColumn }
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
        ready: isMappingReady(mapping, parsed.rows),
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
        ready: isMappingReady(mapping, parsed.rows),
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
            ready: isMappingReady(mapping, s.rows),
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
            ready: isMappingReady(mapping, s.rows),
          }
        : s,
    )
  }, [])

  const runComparison = useCallback(() => {
    if (!prevFileState?.ready || !currFileState?.ready) return
    setBusy(true)
    try {
      const normPrev = normalizeDataset(
        mapRawRows(prevFileState.rows, prevFileState.mapping),
      )
      const normCurr = normalizeDataset(
        mapRawRows(currFileState.rows, currFileState.mapping),
      )
      const prevPay = Boolean(prevFileState.mapping.payableEventCount)
      const currPay = Boolean(currFileState.mapping.payableEventCount)
      const base = mapDataset(normPrev, normCurr, prevPay, currPay)
      setDataset({
        ...base,
        normPrev,
        normCurr,
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
      ready: isMappingReady(mapping, MOCK_PREV),
    })
    setCurrFileState({
      fileName: 'mock-current.csv',
      headers: TARGET_FIELDS,
      rows: MOCK_CURR,
      mapping,
      needsManual: false,
      ready: isMappingReady(mapping, MOCK_CURR),
    })
    setError('')
    const normPrev = normalizeDataset(mapRawRows(MOCK_PREV, mapping))
    const normCurr = normalizeDataset(mapRawRows(MOCK_CURR, mapping))
    setDataset({
      ...mapDataset(normPrev, normCurr, true, true),
      normPrev,
      normCurr,
    })
    setFilters(DEFAULT_FILTERS)
  }, [])

  const breakdownRows = useMemo(() => {
    if (!dataset?.normPrev || !breakdownLevel) return []
    const prev = aggregateByKey(dataset.normPrev, breakdownLevel)
    const curr = aggregateByKey(dataset.normCurr, breakdownLevel)
    return compareAggregates(prev, curr, {
      level: breakdownLevel,
      hasPayableColumn: dataset.hasPayableColumn,
    })
  }, [dataset, breakdownLevel])

  const filteredCampaignRows = useMemo(() => {
    if (!dataset?.campaignRows) return []
    return dataset.campaignRows.filter((r) =>
      passesFilters(r, filters, 'campaign'),
    )
  }, [dataset, filters])

  const filteredBreakdownRows = useMemo(() => {
    return breakdownRows.filter((r) => passesFilters(r, filters, 'breakdown'))
  }, [breakdownRows, filters])

  const summary = useMemo(() => {
    if (!dataset?.campaignRows) {
      return {
        improving: 0,
        declining: 0,
        stable: 0,
        noPayable: 0,
        newSources: 0,
        missingSources: 0,
      }
    }
    const campFiltered = dataset.campaignRows.filter((r) =>
      passesFilters(r, filters, 'campaign'),
    )
    const mediaFiltered = (dataset.mediaRows || []).filter((r) =>
      passesFilters(r, filters, 'breakdown'),
    )
    return summarizeCampaignResults(campFiltered, mediaFiltered)
  }, [dataset, filters])

  const campaignInsightsSummaries = useMemo(() => {
    if (!dataset?.mediaRows || !filteredCampaignRows.length) return []
    const mediaFiltered = dataset.mediaRows.filter((r) =>
      passesFilters(r, filters, 'breakdown'),
    )
    return buildCampaignInsightsSummaries(filteredCampaignRows, mediaFiltered)
  }, [dataset?.mediaRows, filteredCampaignRows, filters])

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
            <FiltersBar
              filters={filters}
              onChange={setFilters}
              statusOptions={STATUS_FILTER_OPTIONS}
              breakdownValue={breakdownLevel}
              onBreakdownChange={setBreakdownLevel}
              breakdownOptions={BREAKDOWN_OPTIONS}
            />

            <SummaryCards summary={summary} />

            <CampaignInsightsSummary summaries={campaignInsightsSummaries} />

            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">
                  Campaign summary
                </h2>
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
            />
          </>
        )}
      </main>
    </div>
  )
}

const CAMP_COLS = [
  { header: 'Campaign', accessor: (r) => r.display.campaign },
  { header: 'Prev primary KPI', accessor: (r) => r.prevPayable },
  { header: 'Current primary KPI', accessor: (r) => r.currPayable },
  { header: 'Prev rate', accessor: (r) => r.prevRate },
  { header: 'Current rate', accessor: (r) => r.currRate },
  { header: 'Status', accessor: (r) => r.status },
  { header: 'Insight', accessor: (r) => r.insight },
]

function BR_COLS(level) {
  return [
    { header: 'Campaign', accessor: (r) => r.display.campaign },
    { header: 'Breakdown', accessor: (r) => detailCell(level, r) },
    { header: 'Prev primary KPI', accessor: (r) => r.prevPayable },
    { header: 'Current primary KPI', accessor: (r) => r.currPayable },
    { header: 'Prev rate', accessor: (r) => r.prevRate },
    { header: 'Current rate', accessor: (r) => r.currRate },
    { header: 'Status', accessor: (r) => r.status },
    { header: 'Insight', accessor: (r) => r.insight },
  ]
}

function detailCell(level, row) {
  if (level === 'campaign') return ''
  if (level === 'campaign_media') return row.display.mediaSource
  if (level === 'campaign_media_agency') {
    return [row.display.mediaSource, row.display.agency].filter(Boolean).join(' | ')
  }
  if (level === 'campaign_attribution') return row.display.attributionType
  if (level === 'campaign_event') return row.display.eventName
  return ''
}
