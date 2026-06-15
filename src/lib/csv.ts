// Minimal client-side CSV download — no dependency (the table is the only consumer
// and xlsx-grade formatting isn't needed). Quotes any field containing a comma,
// double-quote, or newline per RFC 4180 (wrap in quotes, double inner quotes).

function escapeField(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function toCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((cols) => cols.map(escapeField).join(","))
  return lines.join("\r\n")
}

// Build a CSV from headers + already-stringified rows and trigger a download.
// Order of `rows` is the caller's responsibility (the table passes its current
// filtered/sorted row model). The object URL is revoked right after the click so
// the blob isn't leaked.
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: string[][],
): void {
  const blob = new Blob([toCsv(headers, rows)], {
    type: "text/csv;charset=utf-8;",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
