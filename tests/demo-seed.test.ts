// @vitest-environment edge-runtime
import { convexTest } from "convex-test"
import { afterEach, describe, expect, it, vi } from "vitest"
import schema from "../convex/schema"
import { internal } from "../convex/_generated/api"

const modules = import.meta.glob("../convex/**/!(*.*.*)*.*s")
afterEach(() => vi.unstubAllEnvs())

describe("disposable demo seeding", () => {
  it("refuses to write without an explicit demo environment", async () => {
    vi.stubEnv("DEV_BYPASS", "false")
    const t = convexTest(schema, modules)
    await expect(t.mutation(internal.seed.createDemo, {})).rejects.toThrow("Demo utilities require")
    expect(await t.run(ctx => ctx.db.query("drawEvents").collect())).toHaveLength(0)
  })

  it("creates contact-free fictional data in the dashboard demo organization", async () => {
    vi.stubEnv("DEV_BYPASS", "true")
    const t = convexTest(schema, modules)
    const demo = await t.mutation(internal.seed.createDemo, {})
    expect(demo).toMatchObject({ participantsCreated: 100, tiersCreated: 3, prizesCreated: 14 })
    const data = await t.run(async ctx => ({
      participants: await ctx.db.query("participants").collect(),
      orgs: await ctx.db.query("organizations").collect(),
      event: await ctx.db.get(demo.eventId),
    }))
    expect(data.orgs[0].clerkOrgId).toBe("dev_bypass_org")
    expect(data.event?.name).toBe("Demo Night — Fictional Event")
    expect(data.participants).toHaveLength(100)
    expect(new Set(data.participants.map(p => p.name)).size).toBe(100)
    for (const participant of data.participants) {
      expect(participant.name).toMatch(/^Demo Guest \d{3}$/)
      expect(participant.email).toBeUndefined()
      expect(participant.phone).toBeUndefined()
    }
    expect(data.participants.filter(p => p.nameZh)).toHaveLength(60)
    expect(demo.stage).toBe(`/draw/${demo.eventId}/stage`)
  })

  it("preserves prior events and refuses to reset an existing populated event", async () => {
    vi.stubEnv("DEV_BYPASS", "true")
    const t = convexTest(schema, modules)
    const first = await t.mutation(internal.seed.createDemo, {})
    const before = await t.run(ctx => ctx.db.query("prizes").collect())
    await expect(t.mutation(internal.seed.seedDemoData, { eventId: first.eventId })).rejects.toThrow("empty event")
    expect(await t.run(ctx => ctx.db.query("prizes").collect())).toEqual(before)
    const second = await t.mutation(internal.seed.createDemo, {})
    expect(second.eventId).not.toBe(first.eventId)
    expect(await t.run(ctx => ctx.db.query("participants").collect())).toHaveLength(200)
    expect(await t.run(ctx => ctx.db.query("organizations").collect())).toHaveLength(1)
  })
})
