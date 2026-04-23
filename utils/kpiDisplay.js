import { formatCount } from './formatDisplay.js'

/**
 * @param {boolean} [usesPayableBaseline]
 * @param {boolean} [hasPayableKpi] mapped payable or baseline active
 */
export function getKpiDefinitionLine(usesPayableBaseline, hasPayableKpi) {
  if (usesPayableBaseline) {
    return 'KPI = Number of payable events per week (based on baseline rules).'
  }
  if (hasPayableKpi) {
    return 'KPI = Number of payable events per week.'
  }
  return 'KPI = Number of events per week (using total event counts; payable not available).'
}

/**
 * @returns {{ label: string, arrow: string }}
 */
export function getChangeMagnitudeLabel(delta, prev) {
  if (delta > 0) {
    const p = prev != null && Math.abs(prev) > 0 ? (delta / Math.abs(prev)) * 100 : null
    if (p != null && p >= 100) return { label: 'Strong growth', arrow: '▲' }
    if (p != null && p >= 25) return { label: 'Solid growth', arrow: '▲' }
    return { label: 'Growth', arrow: '▲' }
  }
  if (delta < 0) {
    const p = prev != null && Math.abs(prev) > 0 ? (Math.abs(delta) / Math.abs(prev)) * 100 : null
    if (p != null && p >= 100) return { label: 'Sharp decline', arrow: '▼' }
    if (p != null && p >= 25) return { label: 'Meaningful decline', arrow: '▼' }
    return { label: 'Decline', arrow: '▼' }
  }
  return { label: 'No change', arrow: '—' }
}

/**
 * @param {number|null|undefined} prev
 * @param {number|null|undefined} curr
 * @returns {{ previousWeek: string, currentWeek: string, changeLine: string, arrow: string, qual: string } | null}
 */
export function formatEventChangeBlock(prev, curr) {
  const a = prev == null || Number.isNaN(prev) ? null : Number(prev)
  const b = curr == null || Number.isNaN(curr) ? null : Number(curr)
  if (a == null && b == null) {
    return {
      previousWeek: '—',
      currentWeek: '—',
      changeLine: 'Change: —',
      arrow: '—',
      qual: '',
    }
  }
  const prevN = a ?? 0
  const currN = b ?? 0
  const delta = currN - prevN
  let pctText = '—'
  if (a !== 0) {
    const pct = (delta / Math.abs(a)) * 100
    const sign = pct > 0 ? '+' : ''
    pctText = `${sign}${pct.toFixed(0)}%`
  } else if (b !== 0 && a === 0) {
    pctText = 'new activity'
  } else {
    pctText = '0%'
  }
  const { label, arrow } = getChangeMagnitudeLabel(delta, a)
  const dSign = delta > 0 ? '+' : delta < 0 ? '−' : ''
  const dAbs = Math.abs(delta)
  const changeLine = `Change: ${dSign}${dAbs} (${pctText}) ${arrow} ${label}`
  return {
    previousWeek: a == null ? '—' : formatCount(a),
    currentWeek: b == null ? '—' : formatCount(b),
    changeLine,
    arrow,
    qual: label,
  }
}

/**
 * @param {object[]} campaignRows
 * @param {object[]} [mediaRows] for driver names (main media)
 */
export function buildAggregateEventsNarrative(campaignRows, mediaRows) {
  if (!Array.isArray(campaignRows) || campaignRows.length === 0) {
    return ''
  }
  let totPrev = 0
  let totCurr = 0
  for (const r of campaignRows) {
    if (r.prevPayable != null) totPrev += r.prevPayable
    if (r.currPayable != null) totCurr += r.currPayable
  }
  const d = totCurr - totPrev
  const pct = totPrev !== 0 ? (d / Math.abs(totPrev)) * 100 : null
  const absD = Math.abs(d)
  let out
  if (d === 0) {
    out = `Total events were equal week over week (${formatCount(totCurr)} events in the filtered campaign total for each week)`
  } else {
    const pctPart =
      totPrev !== 0 && pct != null && !Number.isNaN(pct)
        ? `, ${(pct > 0 ? '+' : '') + pct.toFixed(0)}% vs. previous week total`
        : ''
    out = `Total events ${
      d > 0 ? 'increased' : 'decreased'
    } from ${formatCount(totPrev)} to ${formatCount(totCurr)} (${d > 0 ? '+' : '−'}${formatCount(
      absD,
    )} events${pctPart})`
  }
  let drivers = ''
  if (Array.isArray(mediaRows) && mediaRows.length > 0) {
    const withDelta = mediaRows
      .filter((m) => m.prev != null && m.curr != null)
      .map((m) => ({
        name: m.display?.mediaSource || '—',
        delta: (m.currPayable ?? 0) - (m.prevPayable ?? 0),
      }))
    const pos = [...withDelta]
      .filter((x) => x.delta > 0)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 2)
    if (pos.length) {
      drivers = `, mainly driven by more events in ${pos.map((x) => x.name).join(' and ')}`
    } else {
      const neg = [...withDelta]
        .filter((x) => x.delta < 0)
        .sort((a, b) => a.delta - b.delta)
        .slice(0, 2)
      if (neg.length) {
        drivers = `, with the largest event drops in ${neg.map((x) => x.name).join(' and ')}`
      }
    }
  }
  return `${out}${drivers}.`
}

/**
 * One-line for CSV
 */
export function formatEventChangeCsv(p, c) {
  const b = formatEventChangeBlock(p, c)
  if (!b) return '—'
  return `Previous week: ${b.previousWeek} events; Current week: ${b.currentWeek} events; ${b.changeLine}`
}
