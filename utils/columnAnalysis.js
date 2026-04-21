/**
 * Inspect raw column values to separate text-like dimensions from numeric metrics.
 */

function isNumericCell(v) {
  if (v == null || v === '') return false
  if (typeof v === 'number') return Number.isFinite(v)
  const s = String(v).trim().replace(/[,$%\s]/g, '')
  if (s === '' || /^n\/?a$/i.test(s) || /^null$/i.test(s)) return false
  const n = Number(s)
  return Number.isFinite(n)
}

function isEmptyCell(v) {
  if (v == null) return true
  const s = String(v).trim()
  if (s === '') return true
  if (/^n\/?a$/i.test(s) || /^null$/i.test(s) || /^-$/.test(s)) return true
  return false
}

/**
 * @param {object[]} rawRows
 * @param {string} sourceColumnKey
 */
export function analyzeColumnContent(rawRows, sourceColumnKey) {
  const total = Array.isArray(rawRows) ? rawRows.length : 0
  if (!sourceColumnKey || total === 0) {
    return {
      total,
      emptyCount: total,
      nonEmptyCount: 0,
      numericAmongNonEmpty: 0,
      emptyRatio: 1,
      numericRatioAmongNonEmpty: 0,
    }
  }

  let emptyCount = 0
  let nonEmptyCount = 0
  let numericAmongNonEmpty = 0

  for (const row of rawRows) {
    if (!row || typeof row !== 'object') {
      emptyCount++
      continue
    }
    if (!Object.prototype.hasOwnProperty.call(row, sourceColumnKey)) {
      emptyCount++
      continue
    }
    const v = row[sourceColumnKey]
    if (isEmptyCell(v)) {
      emptyCount++
      continue
    }
    nonEmptyCount++
    if (isNumericCell(v)) numericAmongNonEmpty++
  }

  const emptyRatio = total > 0 ? emptyCount / total : 1
  const numericRatioAmongNonEmpty =
    nonEmptyCount > 0 ? numericAmongNonEmpty / nonEmptyCount : 0

  return {
    total,
    emptyCount,
    nonEmptyCount,
    numericAmongNonEmpty,
    emptyRatio,
    numericRatioAmongNonEmpty,
  }
}

const EVENT_NAME_MAX_EMPTY_RATIO = 0.75
/** If most non-empty cells parse as numbers, this is a metric column, not a name. */
const EVENT_NAME_MAX_NUMERIC_RATIO = 0.85

const EVENT_COUNT_MIN_NON_EMPTY = 1
const EVENT_COUNT_MIN_NUMERIC_RATIO = 0.6

/** Suitable for event / conversion name: mostly text, reasonably populated. */
export function isValidEventNameColumn(rawRows, sourceColumnKey) {
  const a = analyzeColumnContent(rawRows, sourceColumnKey)
  if (a.nonEmptyCount === 0) return false
  if (a.emptyRatio > EVENT_NAME_MAX_EMPTY_RATIO) return false
  if (a.numericRatioAmongNonEmpty > EVENT_NAME_MAX_NUMERIC_RATIO) return false
  return true
}

/** Event counts must be numeric-heavy. */
export function isValidEventCountColumn(rawRows, sourceColumnKey) {
  const a = analyzeColumnContent(rawRows, sourceColumnKey)
  if (a.nonEmptyCount < EVENT_COUNT_MIN_NON_EMPTY) return false
  return a.numericRatioAmongNonEmpty >= EVENT_COUNT_MIN_NUMERIC_RATIO
}

export function isInvalidEventNameSelection(rawRows, sourceColumnKey) {
  if (!sourceColumnKey) return false
  return !isValidEventNameColumn(rawRows, sourceColumnKey)
}

export function isInvalidEventCountSelection(rawRows, sourceColumnKey) {
  if (!sourceColumnKey) return false
  return !isValidEventCountColumn(rawRows, sourceColumnKey)
}
