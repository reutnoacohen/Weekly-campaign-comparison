/** @typedef {'campaign' | 'campaign_media' | 'campaign_media_agency' | 'campaign_attribution' | 'campaign_event'} BreakdownLevel */

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
  const agency = s(row.agency)
  const attr = s(row.attributionType)
  const event = s(row.eventName)

  switch (level) {
    case 'campaign':
      return campaign
    case 'campaign_media':
      return `${campaign}|||${media}`
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

/**
 * Parse key parts for display (best-effort).
 * @param {string} key
 * @param {BreakdownLevel} level
 */
export function parseKeyForDisplay(key, level) {
  if (level === 'campaign') {
    return { campaign: key === NIL ? null : key, mediaSource: null, agency: null, attributionType: null, eventName: null }
  }
  const parts = String(key).split('|||')
  if (level === 'campaign_media') {
    return {
      campaign: parts[0] === NIL ? null : parts[0],
      mediaSource: parts[1] === NIL ? null : parts[1],
      agency: null,
      attributionType: null,
      eventName: null,
    }
  }
  if (level === 'campaign_media_agency') {
    return {
      campaign: parts[0] === NIL ? null : parts[0],
      mediaSource: parts[1] === NIL ? null : parts[1],
      agency: parts[2] === NIL ? null : parts[2],
      attributionType: null,
      eventName: null,
    }
  }
  if (level === 'campaign_attribution') {
    return {
      campaign: parts[0] === NIL ? null : parts[0],
      mediaSource: null,
      agency: null,
      attributionType: parts[1] === NIL ? null : parts[1],
      eventName: null,
    }
  }
  if (level === 'campaign_event') {
    return {
      campaign: parts[0] === NIL ? null : parts[0],
      mediaSource: null,
      agency: null,
      attributionType: null,
      eventName: parts[1] === NIL ? null : parts[1],
    }
  }
  return {
    campaign: null,
    mediaSource: null,
    agency: null,
    attributionType: null,
    eventName: null,
  }
}

export const BREAKDOWN_OPTIONS = [
  { value: 'campaign', label: 'Campaign Overall' },
  { value: 'campaign_media', label: 'Campaign + Media Source' },
  { value: 'campaign_media_agency', label: 'Campaign + Media Source + Agency' },
  { value: 'campaign_attribution', label: 'Campaign + Attribution Type' },
  { value: 'campaign_event', label: 'Campaign + Event Name' },
]
