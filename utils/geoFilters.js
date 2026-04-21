/**
 * Optional geographic filters on normalized rows (country / state).
 * Empty selections for a dimension mean "all" for that dimension.
 */

/**
 * @param {object[]} rows
 * @param {{ country?: string[], state?: string[] }} filters
 */
export function applyGeoFilter(rows, filters) {
  if (!rows?.length) return rows || []
  const countries = filters?.country
  const states = filters?.state
  if (!countries?.length && !states?.length) return rows
  return rows.filter((r) => {
    if (countries?.length) {
      const c = r.country ?? null
      if (c == null || !countries.includes(c)) return false
    }
    if (states?.length) {
      const s = r.state ?? null
      if (s == null || !states.includes(s)) return false
    }
    return true
  })
}

/**
 * @param {object[]} rows
 * @param {'country' | 'state'} key
 */
export function uniqueSortedGeoValues(rows, key) {
  const set = new Set()
  for (const r of rows || []) {
    const v = r[key]
    if (v != null && v !== '') set.add(v)
  }
  return [...set].sort((a, b) => String(a).localeCompare(String(b)))
}
