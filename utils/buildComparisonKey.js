/** @typedef {'campaign' | 'campaign_media' | 'campaign_media_detail' | 'campaign_media_agency' | 'campaign_attribution' | 'campaign_event'} BreakdownLevel */

const NIL = '__null__'

function s(v) {
  if (v == null || v === '') return NIL
  return String(v).trim()
}

/**
 * @param {object} row normalized row
 * @param {BreakdownLevel} level
 */
export function buildComparisonKey(row, level) {
  const campaign = s(row.campaignName)
  const media = s(row.mediaSource)
  const detail = s(row.sourceDetail)
  const agency = s(row.agency)
  const attr = s(row.attributionType)
  const event = s(row.eventName)

  switch (level) {
    case 'campaign':
      return campaign
    case 'campaign_media':
      return `${campaign}|||${media}`
    case 'campaign_media_detail':
      return `${campaign}|||${media}|||${detail}`
    case 'campaign_media_agency':
      return `${campaign}|||${media}|||${agency}`
    case 'campaign_attribution':
      return `${campaign}|||${attr}`
    case 'campaign_event':
      return `${campaign}|||${event}`
    default:
      return campaign
  }
}

const NIL_DISPLAY = {
  campaign: null,
  mediaSource: null,
  sourceDetail: null,
  agency: null,
  attributionType: null,
  eventName: null,
}

/**
 * Parse key parts for display (best-effort).
 * @param {string} key
 * @param {BreakdownLevel} level
 */
export function parseKeyForDisplay(key, level) {
  if (level === 'campaign') {
    return {
      ...NIL_DISPLAY,
      campaign: key === NIL ? null : key,
    }
  }
  const parts = String(key).split('|||')
  if (level === 'campaign_media') {
    return {
      ...NIL_DISPLAY,
      campaign: parts[0] === NIL ? null : parts[0],
      mediaSource: parts[1] === NIL ? null : parts[1],
    }
  }
  if (level === 'campaign_media_detail') {
    return {
      ...NIL_DISPLAY,
      campaign: parts[0] === NIL ? null : parts[0],
      mediaSource: parts[1] === NIL ? null : parts[1],
      sourceDetail: parts[2] === NIL ? null : parts[2],
    }
  }
  if (level === 'campaign_media_agency') {
    return {
      ...NIL_DISPLAY,
      campaign: parts[0] === NIL ? null : parts[0],
      mediaSource: parts[1] === NIL ? null : parts[1],
      agency: parts[2] === NIL ? null : parts[2],
    }
  }
  if (level === 'campaign_attribution') {
    return {
      ...NIL_DISPLAY,
      campaign: parts[0] === NIL ? null : parts[0],
      attributionType: parts[1] === NIL ? null : parts[1],
    }
  }
  if (level === 'campaign_event') {
    return {
      ...NIL_DISPLAY,
      campaign: parts[0] === NIL ? null : parts[0],
      eventName: parts[1] === NIL ? null : parts[1],
    }
  }
  return { ...NIL_DISPLAY }
}

export const BREAKDOWN_OPTIONS = [
  { value: 'campaign', label: 'Campaign overall' },
  { value: 'campaign_media', label: 'Main media source (aggregated)' },
  {
    value: 'campaign_media_detail',
    label: 'Main media + sub-source / detail',
  },
  { value: 'campaign_media_agency', label: 'Campaign + media + agency' },
  { value: 'campaign_attribution', label: 'Campaign + attribution type' },
  { value: 'campaign_event', label: 'Campaign + event name' },
]
