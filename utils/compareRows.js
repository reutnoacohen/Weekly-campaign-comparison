import { parseKeyForDisplay } from './buildComparisonKey.js'
import { primaryQualityRate } from './calculateMetrics.js'

export const STATUS = {
  IMPROVING: 'Improving',
  DECLINING: 'Declining',
  STABLE: 'Stable',
  WEAK_EVENT_QUALITY: 'Weak Event Quality',
  NO_PAYABLE_EVENTS: 'No Payable Events',
  PAUSED_MISSING: 'Paused / Missing This Week',
  NEW_THIS_WEEK: 'New This Week',
  NOT_ENOUGH_DATA: 'Not Enough Data',
}

function traffic(agg) {
  if (!agg) return false
  return (agg.clicks ?? 0) > 0 || (agg.installs ?? 0) > 0
}

function primary(agg) {
  if (!agg) return null
  return agg.primaryEventCount
}

function enoughToEvaluate(agg) {
  if (!agg) return false
  if (traffic(agg)) return true
  if ((agg.impressions ?? 0) > 0) return true
  const p = primary(agg)
  return p != null && p > 0
}

function primaryRelChange(pp, pc) {
  const a = pp ?? 0
  const b = pc ?? 0
  if (a === 0 && b === 0) return 0
  if (a === 0) return b > 0 ? 1 : 0
  return (b - a) / Math.abs(a)
}

function weakQuality(agg, hasPayableColumn) {
  const tr = traffic(agg)
  const p = primary(agg) ?? 0
  if (!tr) return false
  if (p > 0) return false
  if (
    hasPayableColumn &&
    agg.payableEventCount !== null &&
    agg.payableEventCount === 0
  ) {
    return false
  }
  return true
}

function noPayable(agg, hasPayableColumn) {
  return (
    hasPayableColumn &&
    traffic(agg) &&
    agg.payableEventCount !== null &&
    agg.payableEventCount === 0
  )
}

/**
 * @param {Map<string, object>} prevMap
 * @param {Map<string, object>} currMap
 * @param {object} opts
 * @param {import('./buildComparisonKey.js').BreakdownLevel} opts.level
 * @param {boolean} opts.hasPayableColumn
 */
export function compareAggregates(prevMap, currMap, { level, hasPayableColumn }) {
  const keys = new Set([...prevMap.keys(), ...currMap.keys()])
  const rows = []

  for (const key of keys) {
    const prev = prevMap.get(key) || null
    const curr = currMap.get(key) || null
    const display = parseKeyForDisplay(key, level)

    if (!prev && curr) {
      const rateCurr = primaryQualityRate(curr)
      let status = STATUS.NEW_THIS_WEEK
      let insight =
        'New traffic or source with no prior-week baseline in this file.'

      if (!enoughToEvaluate(curr)) {
        status = STATUS.NOT_ENOUGH_DATA
        insight =
          'Insufficient traffic or events — limited read on performance.'
      } else if (noPayable(curr, hasPayableColumn)) {
        status = STATUS.NO_PAYABLE_EVENTS
        insight =
          'Critical: traffic exists but payable events are zero. Verify tracking and partner rules before scaling.'
      } else if (weakQuality(curr, hasPayableColumn)) {
        status = STATUS.WEAK_EVENT_QUALITY
        insight =
          'Traffic with negligible attributable events — tighten event mapping or investigate fraud and misattribution.'
      }

      rows.push(
        buildRow({
          key,
          display,
          prev: null,
          curr,
          status,
          insight,
          prevRate: null,
          currRate: rateCurr.value,
        }),
      )
      continue
    }

    if (prev && !curr) {
      rows.push(
        buildRow({
          key,
          display,
          prev,
          curr: null,
          status: STATUS.PAUSED_MISSING,
          insight:
            'Present last week but absent this week — investigate pauses, budgets, or name mismatches.',
          prevRate: primaryQualityRate(prev).value,
          currRate: null,
        }),
      )
      continue
    }

    const ratePrev = primaryQualityRate(prev)
    const rateCurr = primaryQualityRate(curr)
    const pPrev = primary(prev)
    const pCurr = primary(curr)

    const noPayCurr = noPayable(curr, hasPayableColumn)
    const noPayPrev = noPayable(prev, hasPayableColumn)

    const ned = !enoughToEvaluate(prev) && !enoughToEvaluate(curr)
    const prc = primaryRelChange(pPrev, pCurr)
    const rateDiff =
      ratePrev.value != null && rateCurr.value != null
        ? rateCurr.value - ratePrev.value
        : 0

    let status = STATUS.STABLE
    let insight =
      'Week-over-week movement is small or mixed between volume and efficiency.'

    if (ned) {
      status = STATUS.NOT_ENOUGH_DATA
      insight =
        'Insufficient traffic or events in one or both weeks — treat movement cautiously.'
    } else if (noPayCurr) {
      status = STATUS.NO_PAYABLE_EVENTS
      insight =
        'Critical: clicks or installs exist but payable events are zero. Review tracking and partner terms.'
    } else if ((traffic(curr) || traffic(prev)) && weakQuality(curr, hasPayableColumn)) {
      status = STATUS.WEAK_EVENT_QUALITY
      insight =
        'Very low or no primary events relative to traffic — review definitions, CRM sync, and network postbacks.'
    } else {
      const clicksUp = (curr.clicks ?? 0) > (prev.clicks ?? 0)
      const instUp = (curr.installs ?? 0) > (prev.installs ?? 0)
      const rateDown = rateDiff < -1e-6

      if (prc > 0.05 && rateDiff >= -1e-6) {
        status = STATUS.IMPROVING
        insight =
          'Primary event volume is up with stable or improving efficiency versus clicks or installs.'
      } else if (prc < -0.05 && rateDiff <= 1e-6) {
        status = STATUS.DECLINING
        insight =
          'Primary event volume is down with flat or weaker efficiency — confirm budget and partner health.'
      } else if (prc > 0 && rateDown && clicksUp) {
        status = STATUS.STABLE
        insight =
          'Clicks are up but primary rate versus traffic worsened — lower traffic quality or higher waste.'
      } else if (prc > 0 && rateDown && instUp) {
        status = STATUS.STABLE
        insight =
          'Install volume grew but primary rate versus installs worsened — check cohort quality and store conversion.'
      } else if (Math.abs(prc) <= 0.05 && Math.abs(rateDiff) <= 1e-6) {
        status = STATUS.STABLE
        insight = 'Primary KPI and efficiency are broadly flat week over week.'
      } else {
        status = STATUS.STABLE
        insight =
          'Mixed week-over-week pattern — interpret together with partner comments and creative changes.'
      }

      if (noPayPrev && !noPayCurr) {
        insight =
          'Bounced back from zero payable last week — validate that recovery holds next week.'
      }
    }

    rows.push(
      buildRow({
        key,
        display,
        prev,
        curr,
        status,
        insight,
        prevRate: ratePrev.value,
        currRate: rateCurr.value,
      }),
    )
  }

  return rows.sort((a, b) =>
    String(a.display.campaign || '').localeCompare(String(b.display.campaign || '')),
  )
}

function buildRow(payload) {
  const {
    key,
    display,
    prev,
    curr,
    status,
    insight,
    prevRate,
    currRate,
  } = payload
  return {
    key,
    display,
    prevPayable: prev?.primaryEventCount ?? null,
    currPayable: curr?.primaryEventCount ?? null,
    prevRawPayable: prev?.payableEventCount ?? null,
    currRawPayable: curr?.payableEventCount ?? null,
    prevRate,
    currRate,
    status,
    insight,
    prev,
    curr,
  }
}
