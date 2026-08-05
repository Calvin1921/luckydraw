import { describe, it, expect } from "vitest"
import { buildEligiblePool, selectWinner } from "@/lib/draw-algorithm"

type TestParticipant = {
  _id: string
  name: string
  nameZh: string | null
  isEligible: boolean
}

const makeP = (overrides: Partial<TestParticipant> = {}): TestParticipant => ({
  _id: crypto.randomUUID(),
  name: "Test User",
  nameZh: null,
  isEligible: true,
  ...overrides,
})

describe("buildEligiblePool", () => {
  it("filters to only eligible participants", () => {
    const pool = buildEligiblePool([
      makeP({ _id: "a", isEligible: true }),
      makeP({ _id: "b", isEligible: false }),
      makeP({ _id: "c", isEligible: true }),
    ])
    expect(pool.map(p => p._id)).toEqual(["a", "c"])
  })

  it("throws when no eligible participants remain", () => {
    expect(() => buildEligiblePool([makeP({ isEligible: false })])).toThrow(
      "No eligible participants"
    )
  })
})

describe("selectWinner", () => {
  it("returns a participant from the eligible pool with a hex seed", () => {
    const participants = Array.from({ length: 10 }, (_, i) => makeP({ _id: `p${i}` }))
    const { winner, seed } = selectWinner(participants)
    expect(participants.map(p => p._id)).toContain(winner._id)
    expect(seed).toMatch(/^[0-9a-f]{8}$/)
  })

  it("never selects an ineligible participant across 50 draws", () => {
    const participants = [
      makeP({ _id: "eligible", isEligible: true }),
      makeP({ _id: "ineligible", isEligible: false }),
    ]
    for (let i = 0; i < 50; i++) {
      expect(selectWinner(participants).winner._id).toBe("eligible")
    }
  })

  it("produces roughly uniform distribution over 1000 draws", () => {
    const participants = Array.from({ length: 5 }, (_, i) => makeP({ _id: `p${i}` }))
    const counts: Record<string, number> = {}
    for (let i = 0; i < 1000; i++) {
      const { winner } = selectWinner(participants)
      counts[winner._id] = (counts[winner._id] ?? 0) + 1
    }
    // Expect each ~200 ± 120 (very lenient — just checking no extreme bias)
    for (const count of Object.values(counts)) {
      expect(count).toBeGreaterThan(80)
      expect(count).toBeLessThan(320)
    }
  })
})
