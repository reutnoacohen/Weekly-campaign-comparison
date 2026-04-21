import { buildComparisonKey } from './buildComparisonKey.js'
import { primaryEventValue } from './calculateMetrics.js'

function addNum(a, b) {
  const av = a ?? 0
  const bv = b ?? 0
  return av + bv
}

/**
 * @param {object[]} rows normalized rows
 * @param {import('./buildComparisonKey.js').BreakdownLevel} level
 */
export function aggregateByKey(rows, level) {
  /** @type {Map<string, { rows: object[], key: string }>} */
  const map = new Map()

  for (const row of rows) {
    const key = buildComparisonKey(row, level)
    if (!map.has(key)) {
      map.set(key, { rows: [], key })
    }
    map.get(key).rows.push(row)
  }

  /** @type {Map<string, object>} */
  const aggMap = new Map()

  for (const [key, { rows: groupRows }] of map) {
    let clicks = 0
    let installs = 0
    let eventCount = 0
    let payableSum = 0
    let hadPayable = false
    let impressions = 0
    let revenue = 0
    let primarySum = 0
    let hadPrimary = false

    for (const r of groupRows) {
      clicks = addNum(clicks, r.clicks)
      installs = addNum(installs, r.installs)
      eventCount = addNum(eventCount, r.eventCount)
      impressions = addNum(impressions, r.impressions)
      revenue = addNum(revenue, r.revenue)

      if (r.payableEventCount !== null && r.payableEventCount !== undefined) {
        payableSum += r.payableEventCount
        hadPayable = true
      }
      const pe = primaryEventValue(r)
      if (pe != null) {
        primarySum += pe
        hadPrimary = true
      }
    }

    const first = groupRows[0] || {}
    const payableEventCount = hadPayable ? payableSum : null
    const primaryEventCount = hadPrimary ? primarySum : null

    aggMap.set(key, {
      key,
      rows: groupRows,
      campaignName: first.campaignName ?? null,
      mediaSource: first.mediaSource ?? null,
      agency: first.agency ?? null,
      attributionType: first.attributionType ?? null,
      eventName: first.eventName ?? null,
      clicks: clicks || null,
      installs: installs || null,
      eventCount: eventCount || null,
      payableEventCount,
      impressions: impressions || null,
      revenue: revenue || null,
      primaryEventCount,
    })
  }

  return aggMap
}
