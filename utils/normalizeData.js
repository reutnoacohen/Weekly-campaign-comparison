const NULL_LIKE = new Set([
  '',
  'n/a',
  'na',
  'null',
  'none',
  '-',
  '--',
  'undefined',
])

function trimString(v) {
  if (v == null) return null
  if (typeof v !== 'string') return String(v).trim() || null
  const t = v.trim()
  if (!t) return null
  const lower = t.toLowerCase()
  if (NULL_LIKE.has(lower)) return null
  return t
}

export function parseNumber(v) {
  if (v == null || v === '') return null
  if (typeof v === 'number') {
    return Number.isFinite(v) ? v : null
  }
  const s = String(v).trim()
  if (!s || NULL_LIKE.has(s.toLowerCase())) return null
  const cleaned = s.replace(/[,$%\s]/g, '')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

const SUMMARY_PATTERNS = [/^\s*total\b/i, /^\s*grand\s*total/i, /^\s*summary\b/i]

function looksLikeSummaryRow(campaignName, rawRow) {
  const c = campaignName?.toLowerCase() ?? ''
  for (const p of SUMMARY_PATTERNS) {
    if (p.test(c)) return true
  }
  const joined = Object.values(rawRow || {})
    .map((x) => String(x ?? '').toLowerCase())
    .join(' ')
  if (joined.includes('grand total') || joined.includes('total row')) return true
  return false
}

/** @returns {object | null} Normalized row or null if invalid/summary */
export function normalizeRow(raw) {
  const campaignName = trimString(raw.campaignName)
  if (looksLikeSummaryRow(campaignName, raw)) return null

  const clicks = parseNumber(raw.clicks)
  const installs = parseNumber(raw.installs)
  const eventCount = parseNumber(raw.eventCount)
  const payableEventCount = parseNumber(raw.payableEventCount)
  const impressions = parseNumber(raw.impressions)
  const revenue = parseNumber(raw.revenue)
  const eventRevenue = parseNumber(raw.eventRevenue)

  const hasAnyNumber =
    [
      clicks,
      installs,
      eventCount,
      payableEventCount,
      impressions,
      revenue,
      eventRevenue,
    ].some((n) => n != null && n !== 0)

  if (!campaignName) return null
  if (!hasAnyNumber) return null

  return {
    campaignName,
    mediaSource: trimString(raw.mediaSource),
    sourceDetail: trimString(raw.sourceDetail),
    agency: trimString(raw.agency),
    eventName: trimString(raw.eventName),
    attributionType: trimString(raw.attributionType),
    country: trimString(raw.country),
    state: trimString(raw.state),
    clicks,
    installs,
    eventCount,
    payableEventCount,
    impressions,
    revenue,
    eventRevenue,
  }
}

/** @param {object[]} rawRows already mapped to canonical field names */
export function normalizeDataset(rawRows) {
  const out = []
  for (const r of rawRows) {
    const n = normalizeRow({
      campaignName: r.campaignName,
      mediaSource: r.mediaSource,
      sourceDetail: r.sourceDetail,
      agency: r.agency,
      eventName: r.eventName,
      attributionType: r.attributionType,
      country: r.country,
      state: r.state,
      clicks: r.clicks,
      installs: r.installs,
      eventCount: r.eventCount,
      payableEventCount: r.payableEventCount,
      impressions: r.impressions,
      revenue: r.revenue,
      eventRevenue: r.eventRevenue,
    })
    if (n) out.push(n)
  }
  return out
}
