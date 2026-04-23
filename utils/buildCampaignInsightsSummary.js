import { STATUS } from './compareRows.js'

function topSubDeltasByDirection(campaignName, mainMedia, mediaDetailRows, positive) {
  if (!Array.isArray(mediaDetailRows) || !mediaDetailRows.length) return []
  const rows = mediaDetailRows.filter(
    (m) =>
      String(m.display?.campaign ?? '') === String(campaignName) &&
      String(m.display?.mediaSource ?? '') === String(mainMedia) &&
      m.prev != null &&
      m.curr != null,
  )
  return rows
    .map((r) => {
      const delta = (r.currPayable ?? 0) - (r.prevPayable ?? 0)
      return {
        sub: r.display?.sourceDetail || '—',
        delta,
        prev: r.prevPayable,
        curr: r.currPayable,
      }
    })
    .filter((x) => (positive ? x.delta > 0 : x.delta < 0))
    .sort((a, b) => (positive ? b.delta - a.delta : a.delta - b.delta))
    .slice(0, 3)
}

/**
 * @param {object[]} campaignRows campaign-level comparison rows
 * @param {object[]} mediaRows main **media source** (campaign + media only)
 * @param {object[] | null} [mediaDetailRows] optional sub-source breakdown; when present, adds supporting notes
 */
export function buildCampaignInsightsSummaries(
  campaignRows,
  mediaRows,
  mediaDetailRows = null,
) {
  if (!Array.isArray(campaignRows) || campaignRows.length === 0) return []

  const hasSub =
    Array.isArray(mediaDetailRows) &&
    mediaDetailRows.length > 0

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
        label: r.display?.mediaSource || 'Unknown main source',
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
        label: r.display?.mediaSource || 'Unknown main source',
        curr: r.currPayable,
      }))

    const missing = sources
      .filter((r) => r.status === STATUS.PAUSED_MISSING)
      .slice(0, 5)
      .map((r) => ({
        label: r.display?.mediaSource || 'Unknown main source',
        prev: r.prevPayable,
      }))

    /** Supporting lines: sub-sources inside a main media (only when detail data exists) */
    const subSourceCallouts = []
    if (hasSub) {
      for (const p of improving.slice(0, 2)) {
        const subs = topSubDeltasByDirection(name, p.label, mediaDetailRows, true)
        if (subs.length) {
          subSourceCallouts.push({ mainSource: p.label, kind: 'up', items: subs })
        }
      }
      for (const d of declining.slice(0, 2)) {
        const subs = topSubDeltasByDirection(name, d.label, mediaDetailRows, false)
        if (subs.length) {
          subSourceCallouts.push({ mainSource: d.label, kind: 'down', items: subs })
        }
      }
    }

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
      subSourceCallouts,
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
      return 'Primary KPI is lower week over week; several main media sources dropped or are missing, while others grew or are new.'
    }
    if (hasNeg) {
      return 'Primary KPI is lower week over week, concentrated in the main media sources that fell or are missing.'
    }
  }
  if (st === STATUS.IMPROVING && hasPos) {
    return 'Primary KPI is higher week over week, led by growth at the main media source level.'
  }
  if (st === STATUS.STABLE) {
    return 'Primary KPI is broadly flat; individual main media sources may still have moved as listed.'
  }
  if (hasNeg && hasPos) {
    return 'Source-level primary KPI is mixed: some main media sources fell or are missing, others grew or are new.'
  }
  if (hasNeg) {
    return 'Source-level primary KPI is down or missing in the listed main media sources.'
  }
  if (hasPos) {
    return 'Source-level primary KPI is up or includes new main media sources as listed.'
  }
  return 'No major changes detected.'
}
