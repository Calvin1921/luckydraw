import Papa from "papaparse"

export type ParsedParticipant = {
  name: string
  nameZh: string | null
  email: string | null
  phone: string | null
}

export type CSVParseResult = {
  valid: ParsedParticipant[]
  errors: Array<{ row: number; message: string }>
}

// Strips leading characters that Excel/Sheets interpret as formula prefixes (REQ-08)
const CSV_INJECTION_CHARS = /^[=+\-@\t\r]/

function sanitizeName(value: string): string {
  return value.replace(CSV_INJECTION_CHARS, "").trim()
}

export function parseParticipantCSV(csvText: string): CSVParseResult {
  if (!csvText.trim()) return { valid: [], errors: [] }

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  })

  const valid: ParsedParticipant[] = []
  const errors: Array<{ row: number; message: string }> = []

  parsed.data.forEach((row, i) => {
    const rowNum = i + 2 // 1 for header + 1 for 1-based index
    const rawName = row["name"]?.trim()
    if (!rawName) {
      errors.push({ row: rowNum, message: "Name is required" })
      return
    }
    valid.push({
      name: sanitizeName(rawName),
      nameZh: row["namezh"]?.trim() ? sanitizeName(row["namezh"].trim()) : null,
      email: row["email"]?.trim() || null,
      phone: row["phone"]?.trim() || null,
    })
  })

  return { valid, errors }
}
