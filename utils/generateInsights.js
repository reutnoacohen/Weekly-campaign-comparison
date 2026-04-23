/**
 * Optional layer on top of comparison rows — surfaces KPI data-quality notes.
 */

export function annotateInsight(row, { hasPayableColumn }) {
  if (!row) return ''
  let text = row.insight || ''
  if (!hasPayableColumn) {
    text +=
      ' This row uses total event counts where payable events are not mapped — add payable mapping when available.'
  }
  return text.trim()
}
