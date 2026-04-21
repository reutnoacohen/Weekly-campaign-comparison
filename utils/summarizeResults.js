import { STATUS } from './compareRows.js'

/**
 * @param {object[]} campaignRows campaign-level comparison
 * @param {object[]} mediaRows campaign + media source level (for new / missing source counts)
 */
export function summarizeCampaignResults(campaignRows, mediaRows) {
  const summary = {
    improving: 0,
    declining: 0,
    stable: 0,
    noPayable: 0,
    newSources: 0,
    missingSources: 0,
  }

  for (const r of campaignRows) {
    switch (r.status) {
      case STATUS.IMPROVING:
        summary.improving++
        break
      case STATUS.DECLINING:
        summary.declining++
        break
      case STATUS.STABLE:
        summary.stable++
        break
      case STATUS.NO_PAYABLE_EVENTS:
        summary.noPayable++
        break
      default:
        break
    }
  }

  if (mediaRows?.length) {
    for (const r of mediaRows) {
      if (r.status === STATUS.NEW_THIS_WEEK) summary.newSources++
      if (r.status === STATUS.PAUSED_MISSING) summary.missingSources++
    }
  }

  return summary
}
