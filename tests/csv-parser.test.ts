import { describe, it, expect } from "vitest"
import { parseParticipantCSV } from "@/lib/csv-parser"

describe("parseParticipantCSV", () => {
  it("parses all columns correctly", () => {
    const csv = `name,nameZh,email,phone\nJohn Smith,約翰,john@test.com,+852 9123 4567\nMary Lee,李美華,mary@test.com,`
    const result = parseParticipantCSV(csv)
    expect(result.valid).toHaveLength(2)
    expect(result.errors).toHaveLength(0)
    expect(result.valid[0]).toEqual({
      name: "John Smith",
      nameZh: "約翰",
      email: "john@test.com",
      phone: "+852 9123 4567",
    })
    expect(result.valid[1].phone).toBeNull()
  })

  it("parses name-only CSV", () => {
    const csv = `name\nAlice\nBob\nCharlie`
    const result = parseParticipantCSV(csv)
    expect(result.valid).toHaveLength(3)
    expect(result.valid[0]).toEqual({ name: "Alice", nameZh: null, email: null, phone: null })
  })

  it("rejects rows with empty name", () => {
    const csv = `name,email\n,empty@test.com\nAlice,alice@test.com`
    const result = parseParticipantCSV(csv)
    expect(result.valid).toHaveLength(1)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].row).toBe(2)
    expect(result.errors[0].message).toMatch(/name is required/i)
  })

  it("handles completely empty file", () => {
    const result = parseParticipantCSV("")
    expect(result.valid).toHaveLength(0)
    expect(result.errors).toHaveLength(0)
  })

  it("sanitizes CSV injection characters", () => {
    const csv = `name\n=HYPERLINK("evil")\n+cmd|' /C calc\nAlice`
    const result = parseParticipantCSV(csv)
    expect(result.valid[0].name).toBe('HYPERLINK("evil")')
    expect(result.valid[1].name).toBe("cmd|' /C calc")
    expect(result.valid[2].name).toBe("Alice")
  })
})
