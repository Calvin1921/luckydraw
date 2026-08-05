// @vitest-environment edge-runtime
import { convexTest } from "convex-test"
import { describe, expect, it } from "vitest"
import schema from "../convex/schema"
import { api } from "../convex/_generated/api"

const modules = import.meta.glob("../convex/**/!(*.*.*)*.*s")

const CLERK_ORG = "org_test_1"

async function seedEvent(t: ReturnType<typeof convexTest>) {
  return t.run(async ctx => {
    const orgId = await ctx.db.insert("organizations", {
      clerkOrgId: CLERK_ORG,
      name: "Test Org",
      slug: "test-org",
      plan: "per_event",
    })
    const eventId = await ctx.db.insert("drawEvents", {
      orgId,
      name: "Test Event",
      status: "draft",
      primaryColor: "#e2a84b",
      locale: "en",
    })
    await ctx.db.insert("participants", {
      eventId,
      name: "Ada Wong",
      nameZh: "黃雅達",
      email: "ada@example.com",
      phone: "+85290000000",
      importSource: "csv",
      isEligible: true,
    })
    return eventId
  })
}

describe("access control on PII-bearing queries (VULN-001/002/003)", () => {
  it("participants.list rejects unauthenticated callers", async () => {
    const t = convexTest(schema, modules)
    const eventId = await seedEvent(t)
    await expect(t.query(api.participants.list, { eventId })).rejects.toThrow(
      "Unauthenticated"
    )
  })

  it("participants.list rejects callers from a different org", async () => {
    const t = convexTest(schema, modules)
    const eventId = await seedEvent(t)
    const stranger = t.withIdentity({ subject: "user_2", orgId: "org_other" })
    await expect(stranger.query(api.participants.list, { eventId })).rejects.toThrow(
      "Forbidden"
    )
  })

  it("participants.list returns rows for the owning org", async () => {
    const t = convexTest(schema, modules)
    const eventId = await seedEvent(t)
    const owner = t.withIdentity({ subject: "user_1", orgId: CLERK_ORG })
    const rows = await owner.query(api.participants.list, { eventId })
    expect(rows).toHaveLength(1)
    expect(rows[0].email).toBe("ada@example.com")
  })

  it("participants.listForDraw is public but never exposes email/phone", async () => {
    const t = convexTest(schema, modules)
    const eventId = await seedEvent(t)
    const rows = await t.query(api.participants.listForDraw, { eventId })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual({
      _id: expect.anything(),
      name: "Ada Wong",
      nameZh: "黃雅達",
      isEligible: true,
    })
    expect(Object.keys(rows[0])).not.toContain("email")
    expect(Object.keys(rows[0])).not.toContain("phone")
  })

  it("winnerLogs.listConfirmed rejects unauthenticated callers", async () => {
    const t = convexTest(schema, modules)
    const eventId = await seedEvent(t)
    await expect(
      t.query(api.winnerLogs.listConfirmed, { eventId })
    ).rejects.toThrow("Unauthenticated")
  })

  it("events.list rejects unauthenticated callers", async () => {
    const t = convexTest(schema, modules)
    const orgId = await t.run(async ctx =>
      ctx.db.insert("organizations", {
        clerkOrgId: CLERK_ORG,
        name: "Test Org",
        slug: "test-org",
        plan: "per_event",
      })
    )
    await expect(t.query(api.events.list, { orgId })).rejects.toThrow(
      "Unauthenticated"
    )
  })
})
