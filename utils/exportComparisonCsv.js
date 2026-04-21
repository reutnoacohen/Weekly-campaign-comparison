function escapeCell(val) {
  if (val == null) return ''
  const s = String(val)
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function exportRowsToCsv(filename, columns, dataRows) {
  const lines = [columns.map((c) => escapeCell(c.header)).join(',')]
  for (const row of dataRows) {
    lines.push(
      columns.map((c) => escapeCell(c.accessor(row))).join(','),
    )
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
