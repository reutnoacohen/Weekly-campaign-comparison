export function formatPercent(rate) {
  if (rate == null || Number.isNaN(rate)) return '—'
  return `${(rate * 100).toFixed(2)}%`
}

export function formatCount(n) {
  if (n == null || Number.isNaN(n)) return '—'
  return new Intl.NumberFormat().format(n)
}
