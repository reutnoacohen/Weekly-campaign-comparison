/**
 * Coverage stats for a raw column after upload (before normalization).
 */
export function getColumnStats(rawRows, sourceColumnKey) {
  const total = Array.isArray(rawRows) ? rawRows.length : 0
  if (!sourceColumnKey || !total) {
    return { total, nonEmpty: 0, distinct: 0 }
  }
  const vals = []
  for (const row of rawRows) {
    if (!row || typeof row !== 'object') continue
    if (!Object.prototype.hasOwnProperty.call(row, sourceColumnKey)) continue
    const v = row[sourceColumnKey]
    if (v != null && String(v).trim() !== '') {
      vals.push(String(v).trim())
    }
  }
  return {
    total,
    nonEmpty: vals.length,
    distinct: new Set(vals).size,
  }
}
