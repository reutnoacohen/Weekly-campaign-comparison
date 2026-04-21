import { STATUS } from './compareRows.js'

/**
 * @param {object[]} campaignRows filtered campaign-level comparison rows
 * @param {object[]} mediaRows filtered campaign+media comparison rows (same filters as breakdown)
 */
export function buildCampaignInsightsSummaries(campaignRows, mediaRows) {
  if (!Array.isArray(campaignRows) || campaignRows.length === 0) return []

  return campaignRows.map((campRow) => {
    const name = campRow.display?.campaign ?? '—'
    const sources = mediaRows.filter(
      (m) => String(m.display?.campaign ?? '') === String(name),
    )

    const bothWeeks = sources.filter((r) => r.prev != null && r.curr != null)
    const withDelta = bothWeeks
      .map((r) => ({
        row: r,
        delta: (r.currPayable ?? 0) - (r.prevPayable ?? 0),
        label: r.display?.mediaSource || 'Unknown source',
      }))
      .filter((x) => x.delta !== 0)

    const declining = [...withDelta]
      .filter((x) => x.delta < 0)
      .sort((a, b) => a.delta - b.delta)
      .slice(0, 3)
      .map((x) => ({
        label: x.label,
        prev: x.row.prevPayable,
        curr: x.row.currPayable,
      }))

    const improving = [...withDelta]
      .filter((x) => x.delta > 0)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 3)
      .map((x) => ({
        label: x.label,
        prev: x.row.prevPayable,
        curr: x.row.currPayable,
      }))

    const newSources = sources
      .filter((r) => r.status === STATUS.NEW_THIS_WEEK)
      .slice(0, 5)
      .map((r) => ({
        label: r.display?.mediaSource || 'Unknown source',
        curr: r.currPayable,
      }))

    const missing = sources
      .filter((r) => r.status === STATUS.PAUSED_MISSING)
      .slice(0, 5)
      .map((r) => ({
        label: r.display?.mediaSource || 'Unknown source',
        prev: r.prevPayable,
      }))

    const conclusion = buildConclusion(
      campRow,
      declining,
      improving,
      newSources,
      missing,
    )

    return {
      campaignName: name,
      status: campRow.status,
      declining,
      improving,
      newSources,
      missing,
      conclusion,
    }
  })
}

function buildConclusion(campRow, declining, improving, newSources, missing) {
  if (
    declining.length === 0 &&
    improving.length === 0 &&
    newSources.length === 0 &&
    missing.length === 0
  ) {
    return 'No major changes detected.'
  }

  const st = campRow.status
  const hasNeg = declining.length > 0 || missing.length > 0
  const hasPos = improving.length > 0 || newSources.length > 0

  if (st === STATUS.DECLINING) {
    if (hasNeg && hasPos) {
      return 'Primary KPI is lower week over week; several sources dropped or are missing, while others grew or are new.'
    }
    if (hasNeg) {
      return 'Primary KPI is lower week over week, concentrated in the sources that fell or are missing.'
    }
  }
  if (st === STATUS.IMPROVING && hasPos) {
    return 'Primary KPI is higher week over week, led by the sources that grew or are new.'
  }
  if (st === STATUS.STABLE) {
    return 'Primary KPI is broadly flat; individual sources still moved as listed.'
  }
  if (hasNeg && hasPos) {
    return 'Source-level primary KPI is mixed: some sources fell or are missing, others grew or are new.'
  }
  if (hasNeg) {
    return 'Source-level primary KPI is down or missing in the listed sources.'
  }
  if (hasPos) {
    return 'Source-level primary KPI is up or includes new sources as listed.'
  }
  return 'No major changes detected.'
}
