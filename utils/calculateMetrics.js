/**
 * Primary KPI: payable events, else event count.
 */
export function primaryEventValue(row) {
  if (row.payableEventCount !== null && row.payableEventCount !== undefined) {
    return row.payableEventCount
  }
  if (row.eventCount != null && row.eventCount !== undefined) {
    return row.eventCount
  }
  return null
}

export function sumPrimaryEvents(rows) {
  let sum = 0
  let hadValue = false
  for (const r of rows) {
    const p = primaryEventValue(r)
    if (p != null) {
      sum += p
      hadValue = true
    }
  }
  return hadValue ? sum : null
}

/**
 * @param {object} agg aggregated metrics
 */
export function payableToClickRate(agg) {
  const primary = agg.primaryEventCount
  const clicks = agg.clicks ?? 0
  if (primary == null || clicks <= 0) return null
  return primary / clicks
}

export function payableToInstallRate(agg) {
  const primary = agg.primaryEventCount
  const inst = agg.installs ?? 0
  if (primary == null || inst <= 0) return null
  return primary / inst
}

export function ctr(agg) {
  const clicks = agg.clicks ?? 0
  const imp = agg.impressions ?? 0
  if (imp <= 0) return null
  return clicks / imp
}

/**
 * Preferred quality rate: payable/click, else payable/install, else null.
 */
export function primaryQualityRate(agg) {
  const pc = payableToClickRate(agg)
  if (pc != null) return { value: pc, basis: 'click' }
  const pi = payableToInstallRate(agg)
  if (pi != null) return { value: pi, basis: 'install' }
  return { value: null, basis: null }
}
