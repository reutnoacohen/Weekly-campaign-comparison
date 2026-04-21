/**
 * Optional layer on top of comparison rows — surfaces KPI data-quality notes.
 */

export function annotateInsight(row, { hasPayableColumn }) {
  if (!row) return ''
  let text = row.insight || ''
  if (!hasPayableColumn) {
    text +=
      ' KPI uses total events where payable events are not mapped — add payable mapping when available.'
  }
  return text.trim()
}
