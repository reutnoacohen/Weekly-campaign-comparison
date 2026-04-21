import Papa from 'papaparse'
import * as XLSX from 'xlsx'

/** Strip BOM / trim so mapping keys match row object keys (common CSV issue). */
function cleanHeaderCell(h) {
  return String(h ?? '')
    .replace(/^\uFEFF/, '')
    .trim()
}

function toObjects(headerRow, dataRows) {
  const headers = headerRow.map((h) => cleanHeaderCell(h))
  return dataRows.map((cells) => {
    const obj = {}
    headers.forEach((h, idx) => {
      obj[h] = cells[idx]
    })
    return obj
  })
}

/**
 * @param {{ rows: object[], headers: string[] }} table
 */
function normalizeParsedTable(table) {
  const { rows, headers } = table
  const rawHeaders = Array.isArray(headers) ? headers : []
  const cleaned = rawHeaders.map((h) => cleanHeaderCell(h))
  if (!rows?.length) {
    return { rows: rows || [], headers: cleaned }
  }
  const remapped = rows.map((row) => {
    if (!row || typeof row !== 'object') return row
    const next = {}
    for (let i = 0; i < rawHeaders.length; i++) {
      const oldKey = rawHeaders[i]
      const newKey = cleaned[i]
      if (Object.prototype.hasOwnProperty.call(row, oldKey)) {
        next[newKey] = row[oldKey]
      }
    }
    for (const k of Object.keys(row)) {
      if (!rawHeaders.includes(k)) {
        next[cleanHeaderCell(k)] = row[k]
      }
    }
    return next
  })
  return { rows: remapped, headers: cleaned }
}

export function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        if (res.errors?.length) {
          const fatal = res.errors.find((e) => e.type === 'Quotes' || e.type === 'FieldMismatch')
          if (fatal) {
            reject(new Error(fatal.message || 'CSV parse error'))
            return
          }
        }
        resolve(
          normalizeParsedTable({
            rows: res.data,
            headers: res.meta.fields || [],
          }),
        )
      },
      error: (err) => reject(err),
    })
  })
}

export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const wb = XLSX.read(data, { type: 'array' })
        const sheetName = wb.SheetNames[0]
        const sheet = wb.Sheets[sheetName]
        const matrix = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: '',
          blankrows: false,
        })
        if (!matrix.length) {
          resolve({ rows: [], headers: [] })
          return
        }
        const headerRow = matrix[0]
        const dataRows = matrix.slice(1)
        const rows = toObjects(headerRow, dataRows)
        const headers = headerRow.map((h) => cleanHeaderCell(h))
        resolve(normalizeParsedTable({ rows, headers }))
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}

export async function parseUploadedFile(file) {
  const name = file.name?.toLowerCase() || ''
  if (name.endsWith('.csv')) {
    return parseCsvFile(file)
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xlsm') || name.endsWith('.xls')) {
    return parseExcelFile(file)
  }
  throw new Error('Unsupported file type. Use CSV, XLSX, or XLSM.')
}
