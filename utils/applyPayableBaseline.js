import { parseNumber } from './normalizeData.js'

/** @typedef {{ useBaseline: boolean, payableEventName: string, revenueBaseline: string }} PayableConfig */

/**
 * @param {Record<string, string>} mapping
 * @param {PayableConfig} config
 */
export function isBaselineKpiEnabled(mapping, config) {
  if (!config?.useBaseline) return false
  if (mapping?.payableEventCount) return false
  if (!mapping?.eventName || !mapping?.eventRevenue) return false
  const name = String(config.payableEventName ?? '').trim()
  if (!name) return false
  const b = parseNumber(config.revenueBaseline)
  return b != null && Number.isFinite(b)
}

/**
 * Fills per-row `payableEventCount` (0 or 1) from event name + event revenue.
 * @param {object[]} mappedRows rows after mapRawRows
 * @param {Record<string, string>} mapping
 * @param {PayableConfig} config
 * @returns {object[]}
 */
export function applyPayableBaselineToMappedRows(mappedRows, mapping, config) {
  if (!isBaselineKpiEnabled(mapping, config)) {
    return mappedRows
  }
  const target = String(config.payableEventName ?? '').trim()
  const baseline = parseNumber(config.revenueBaseline)
  if (baseline == null) return mappedRows

  return mappedRows.map((row) => {
    const en = row.eventName
    const er = row.eventRevenue
    const nameStr = en == null ? '' : String(en).trim()
    const ev = parseNumber(er)
    const qualifies =
      nameStr === target && ev != null && ev >= baseline
    return {
      ...row,
      payableEventCount: qualifies ? 1 : 0,
    }
  })
}
