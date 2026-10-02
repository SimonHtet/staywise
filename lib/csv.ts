// CSV for Excel: UTF-8 BOM so Thai / Burmese text opens correctly, CRLF rows,
// and text cells that start with = + - @ are prefixed with ' so a guest name
// can't run as a spreadsheet formula (CSV injection).
type Cell = string | number | boolean | null | undefined | Date

function cell(v: Cell): string {
  if (v === null || v === undefined) return ''
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : ''
  if (typeof v === 'boolean') return v ? 'yes' : 'no'
  let s = String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(header: string[], rows: Cell[][]): string {
  return '﻿' + [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n'
}
