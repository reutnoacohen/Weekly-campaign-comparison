/**
 * Flexible column mapping for heterogeneous exports (AppsFlyer, Singular, CRM).
 */

import {
  isValidEventCountColumn,
  isValidEventNameColumn,
} from './columnAnalysis.js'

export const TARGET_FIELDS = [
  'campaignName',
  'mediaSource',
  'agency',
  'eventName',
  'attributionType',
  'clicks',
  'installs',
  'eventCount',
  'payableEventCount',
  'impressions',
  'revenue',
]

/** Assign metrics and dimensions before eventName so short header tokens cannot steal columns. */
const FIELD_ASSIGN_ORDER = [
  'campaignName',
  'mediaSource',
  'agency',
  'attributionType',
  'clicks',
  'installs',
  'eventCount',
  'payableEventCount',
  'impressions',
  'revenue',
  'eventName',
]

const SYNONYMS = {
  campaignName: [
    'campaign',
    'campaign name',
    'campaignname',
    'campaign_name',
    'app campaign',
    'sub campaign',
  ],
  mediaSource: [
    'media source',
    'mediasource',
    'media_source',
    'publisher',
    'source',
    'site id',
    'site_id',
    'channel',
    'partner',
    'af_prt',
  ],
  agency: ['agency', 'agency name', 'partner agency', 'af agency'],
  eventName: [
    'event name',
    'eventname',
    'event_name',
    'af event name',
    'event label',
    'eventlabel',
    'named event',
    'conversion event',
    'conversion event name',
    'in app event',
    'in-app event',
    'inapp event',
    'app event',
    'activity event',
    'activity name',
    'custom event',
    'custom event name',
    'postback event',
    'event type',
    'event identifier',
    'original event name',
    'sub event',
    'subevent',
    'goal name',
  ],
  attributionType: [
    'attribution',
    'attribution type',
    'attributiontype',
    'attribution_type',
    'conversion type',
    'event source',
  ],
  clicks: ['clicks', 'click', 'total clicks', 'all clicks', 'tap'],
  installs: [
    'installs',
    'install',
    'attributed installs',
    'conversions',
    'conversion',
  ],
  eventCount: [
    'eventcount',
    'events',
    'event count',
    'total events',
    'total attributions',
    'total attributions appsflyer',
    'attributions appsflyer',
    'attributions',
  ],
  payableEventCount: [
    'payableeventcount',
    'payable events',
    'payable_event_count',
    'revenue events',
    'billable events',
    'qualified events',
  ],
  impressions: [
    'impressions',
    'impr',
    'imp',
    'views',
    'total impressions',
  ],
  revenue: [
    'revenue',
    'rev',
    'total revenue',
    'af_revenue',
    'usd revenue',
    'amount',
  ],
}

function normalizeHeader(h) {
  if (h == null || typeof h !== 'string') return ''
  return h
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[_-]+/g, ' ')
}

function bestFieldForHeader(headerNorm) {
  if (headerNorm === 'event') {
    return { field: 'eventName', score: 99 }
  }

  let bestField = null
  let bestScore = 0

  for (const field of TARGET_FIELDS) {
    const syns = SYNONYMS[field]
    for (const syn of syns) {
      const sn = syn.toLowerCase()
      if (headerNorm === sn) {
        return { field, score: 100 }
      }
      if (headerNorm.includes(sn) || sn.includes(headerNorm)) {
        const score = Math.min(headerNorm.length, sn.length)
        if (score > bestScore) {
          bestScore = score
          bestField = field
        }
      }
    }
  }

  if (bestScore >= 3) {
    return { field: bestField, score: bestScore }
  }
  return { field: null, score: 0 }
}

function filterCandidatesForField(field, candidates, rawRows) {
  if (field === 'eventName') {
    if (!rawRows?.length) return []
    return candidates.filter((c) => isValidEventNameColumn(rawRows, c.raw))
  }
  if (field === 'eventCount') {
    if (!rawRows?.length) return candidates
    return candidates.filter((c) => isValidEventCountColumn(rawRows, c.raw))
  }
  return candidates
}

/**
 * @param {string[]} headers Raw first-row headers from CSV/Excel
 * @param {object[]} [rawRows] Parsed rows — required for safe eventName / eventCount detection
 * @returns {{ mapping: Record<string, string>, ambiguous: string[], needsManual: boolean, hasPayableColumn: boolean }}
 */
export function autoDetectMapping(headers, rawRows = []) {
  if (!Array.isArray(headers)) {
    return {
      mapping: {},
      ambiguous: [],
      needsManual: true,
      hasPayableColumn: false,
    }
  }

  const headerList = headers.map((h) => String(h ?? ''))
  const mapping = {}
  const usedColumns = new Set()
  const conflicts = []

  const scored = headerList.map((raw) => {
    const norm = normalizeHeader(raw)
    const { field, score } = bestFieldForHeader(norm)
    return { raw, norm, field, score }
  })

  const byField = {}
  for (const s of scored) {
    if (!s.field) continue
    if (!byField[s.field]) byField[s.field] = []
    byField[s.field].push(s)
  }

  for (const field of FIELD_ASSIGN_ORDER) {
    let candidates = byField[field] || []
    if (candidates.length === 0) continue

    candidates = filterCandidatesForField(field, candidates, rawRows)
    if (candidates.length === 0) continue

    candidates.sort((a, b) => b.score - a.score)
    const top = candidates[0]
    const tied = candidates.filter((c) => c.score === top.score && c.raw !== top.raw)
    if (tied.length > 0) {
      conflicts.push(field)
    }
    if (!usedColumns.has(top.raw)) {
      mapping[field] = top.raw
      usedColumns.add(top.raw)
    }
  }

  if (mapping.eventName && rawRows?.length && !isValidEventNameColumn(rawRows, mapping.eventName)) {
    delete mapping.eventName
  }
  if (mapping.eventCount && rawRows?.length && !isValidEventCountColumn(rawRows, mapping.eventCount)) {
    delete mapping.eventCount
  }

  const hasCampaign = Boolean(mapping.campaignName)
  const hasAnyMetric =
    mapping.clicks ||
    mapping.installs ||
    mapping.eventCount ||
    mapping.payableEventCount

  const needsManual =
    !hasCampaign ||
    !hasAnyMetric ||
    conflicts.length > 0

  return {
    mapping,
    ambiguous: conflicts,
    needsManual: Boolean(needsManual),
    hasPayableColumn: Boolean(mapping.payableEventCount),
  }
}

export function getMappingValidationIssues(rawRows, mapping) {
  if (!mapping || !rawRows?.length) {
    return { eventNameInvalid: false, eventCountInvalid: false }
  }
  const eventNameInvalid = Boolean(
    mapping.eventName && !isValidEventNameColumn(rawRows, mapping.eventName),
  )
  const eventCountInvalid = Boolean(
    mapping.eventCount && !isValidEventCountColumn(rawRows, mapping.eventCount),
  )
  return { eventNameInvalid, eventCountInvalid }
}

/**
 * @param {Record<string, string>} mapping target field -> source column name
 */
export function mapRawRows(rawRows, mapping) {
  return rawRows.map((rowObj) => {
    const o = {}
    for (const field of TARGET_FIELDS) {
      const col = mapping[field]
      if (col && Object.prototype.hasOwnProperty.call(rowObj, col)) {
        o[field] = rowObj[col]
      }
    }
    return o
  })
}

export function buildRowFromMapping(rowObj, mapping) {
  const get = (field) => {
    const col = mapping[field]
    if (!col || !(col in rowObj)) return undefined
    return rowObj[col]
  }
  return {
    campaignName: get('campaignName'),
    mediaSource: get('mediaSource'),
    agency: get('agency'),
    eventName: get('eventName'),
    attributionType: get('attributionType'),
    clicks: get('clicks'),
    installs: get('installs'),
    eventCount: get('eventCount'),
    payableEventCount: get('payableEventCount'),
    impressions: get('impressions'),
    revenue: get('revenue'),
  }
}

/**
 * @param {object[]} [rawRows] When provided, blocks Compare if eventName/eventCount point at wrong-shaped columns.
 */
export function isMappingReady(mapping, rawRows = null) {
  const hasCampaign = Boolean(mapping.campaignName)
  const hasMetric =
    mapping.clicks ||
    mapping.installs ||
    mapping.eventCount ||
    mapping.payableEventCount
  if (!hasCampaign || !hasMetric) return false

  if (rawRows?.length) {
    const { eventNameInvalid, eventCountInvalid } = getMappingValidationIssues(
      rawRows,
      mapping,
    )
    if (eventNameInvalid || eventCountInvalid) return false
  }
  return true
}
