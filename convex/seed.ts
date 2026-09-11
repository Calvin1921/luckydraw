import { internalMutation, type MutationCtx } from "./_generated/server"
import { v } from "convex/values"
import type { Id } from "./_generated/dataModel"

// Deliberately fictional labels, with no contact details or real-world identities.
const CHINESE_PARTICIPANTS = Array.from({ length: 60 }, (_, i) => ({
  name: `Demo Guest ${String(i + 1).padStart(3, "0")}`,
  nameZh: `示範參加者 ${String(i + 1).padStart(3, "0")}`,
}))
const ENGLISH_PARTICIPANTS = Array.from({ length: 40 }, (_, i) => ({
  name: `Demo Guest ${String(i + 61).padStart(3, "0")}`,
}))

function requireDemoDeployment() {
  if (process.env.DEV_BYPASS !== "true") {
    throw new Error("Demo utilities require DEV_BYPASS=true on a disposable development deployment")
  }
}

async function seedEmptyEvent(ctx: MutationCtx, args: { eventId: Id<"drawEvents"> }) {
  requireDemoDeployment()
  // Refuse to modify an event with existing data.
  const event = await ctx.db.get(args.eventId)
  if (!event) throw new Error(`Event not found: ${args.eventId}`)

  // Seed only an empty event; never replace prizes or existing results.
  const existingParticipants = await ctx.db
    .query("participants")
    .withIndex("by_event", q => q.eq("eventId", args.eventId))
    .take(1)

  const existingPrizes = await ctx.db.query("prizes").withIndex("by_event", q => q.eq("eventId", args.eventId)).first()
  const existingTiers = await ctx.db.query("prizeTiers").withIndex("by_event", q => q.eq("eventId", args.eventId)).first()
  const existingSessions = await ctx.db.query("drawSessions").withIndex("by_event", q => q.eq("eventId", args.eventId)).first()
  const existingLogs = await ctx.db.query("winnerLogs").withIndex("by_event_action", q => q.eq("eventId", args.eventId)).first()
  if (existingParticipants.length || existingPrizes || existingTiers || existingSessions || existingLogs) {
    throw new Error("Demo seed requires an empty event; create a fresh demo instead")
  }
  let participantsCreated = 0

  if (existingParticipants.length === 0) {
    await Promise.all(
      CHINESE_PARTICIPANTS.map(p =>
        ctx.db.insert("participants", {
          eventId: args.eventId,
          name: p.name,
          nameZh: p.nameZh,
          isEligible: true,
          importSource: "manual",
        })
      )
    )

    await Promise.all(
      ENGLISH_PARTICIPANTS.map(p =>
        ctx.db.insert("participants", {
          eventId: args.eventId,
          name: p.name,
          isEligible: true,
          importSource: "manual",
        })
      )
    )

    participantsCreated = CHINESE_PARTICIPANTS.length + ENGLISH_PARTICIPANTS.length
  }

  // Tier 1 — Consolation Prize (10 x Demo Gift Voucher)
  const tier1Id = await ctx.db.insert("prizeTiers", {
    eventId: args.eventId,
    name: "Consolation Prize",
    nameZh: "安慰獎",
    drawOrder: 1,
    allowRepeat: false,
  })
  await Promise.all(
    Array.from({ length: 10 }, () =>
      ctx.db.insert("prizes", {
        tierId: tier1Id,
        eventId: args.eventId,
        name: "Demo Gift Voucher",
        nameZh: "示範禮品券",
        isAwarded: false,
      })
    )
  )

  // Tier 2 — Second Prize (3 x Demo Earbuds)
  const tier2Id = await ctx.db.insert("prizeTiers", {
    eventId: args.eventId,
    name: "Second Prize",
    nameZh: "二等獎",
    drawOrder: 2,
    allowRepeat: false,
  })
  await Promise.all(
    Array.from({ length: 3 }, () =>
      ctx.db.insert("prizes", {
        tierId: tier2Id,
        eventId: args.eventId,
        name: "Demo Earbuds",
        nameZh: "無線耳機",
        isAwarded: false,
      })
    )
  )

  // Tier 3 — Grand Prize (1 x Demo Grand Prize)
  const tier3Id = await ctx.db.insert("prizeTiers", {
    eventId: args.eventId,
    name: "Grand Prize",
    nameZh: "大獎",
    drawOrder: 3,
    allowRepeat: false,
  })
  await ctx.db.insert("prizes", {
    tierId: tier3Id,
    eventId: args.eventId,
    name: "Demo Grand Prize",
    nameZh: "Demo Grand Prize",
    isAwarded: false,
  })

  const tiersCreated = 3
  const prizesCreated = 10 + 3 + 1

  return { participantsCreated, tiersCreated, prizesCreated }
}

export const seedDemoData = internalMutation({
  args: { eventId: v.id("drawEvents") },
  handler: seedEmptyEvent,
})

/** One-time migration: clear legacy drawTheme values so schema validation passes.
 *  Maps old → new where obvious; clears the rest (user re-selects from new options).
 *  Run once: npx convex run seed:migrateDrawThemes
 */
export const migrateDrawThemes = internalMutation({
  args: {},
  handler: async (ctx) => {
    requireDemoDeployment()
    const MAP: Record<string, string> = {
      classic:   "luckyballs",
      galaxy:    "luckyballs",
      neon:      "cyber",
      elegant:   "crystal",
      explosive: "luckyballs",
    }
    const events = await ctx.db.query("drawEvents").collect()
    let migrated = 0
    for (const event of events) {
      const theme = event.drawTheme as string | undefined
      if (!theme) continue
      if (["luckyballs","crystal","cyber"].includes(theme)) continue
      const mapped = MAP[theme] ?? "luckyballs"
      await ctx.db.patch(event._id, { drawTheme: mapped as "luckyballs" | "crystal" | "cyber" | undefined })
      migrated++
    }
    return { migrated }
  },
})

/** Create a test event with a dummy org — dev use only.
 *  npx convex run seed:createTestEvent
 */
async function createEmptyDemoEvent(ctx: MutationCtx) {
  requireDemoDeployment()
  // Create or reuse a dummy org
  const existingOrg = await ctx.db
    .query("organizations")
    .withIndex("by_clerk_org_id", q => q.eq("clerkOrgId", "dev_bypass_org"))
    .first()

  const orgId = existingOrg?._id ?? await ctx.db.insert("organizations", {
    clerkOrgId: "dev_bypass_org",
    name: "Demo Organization",
    slug: "demo-org",
    plan: "agency",
  })

  const eventId = await ctx.db.insert("drawEvents", {
    orgId,
    name: "Demo Night — Fictional Event",
    nameZh: "示範活動 — 虛構資料",
    status: "active",
    primaryColor: "#e2a84b",
    locale: "both",
    drawTheme: "nova",
  })

  return { orgId, eventId }
}

export const createTestEvent = internalMutation({ args: {}, handler: createEmptyDemoEvent })

/** Creates a new event on every run; leaves all earlier events untouched. */
export const createDemo = internalMutation({
  args: {},
  handler: async (ctx) => {
    const { eventId } = await createEmptyDemoEvent(ctx)
    const counts = await seedEmptyEvent(ctx, { eventId })
    return {
      ...counts,
      eventId,
      organizer: `/events/${eventId}`,
      stage: `/draw/${eventId}/stage`,
      remote: `/draw/${eventId}/remote`,
      audience: `/draw/${eventId}/audience`,
    }
  },
})

/** Destructive maintenance: wipes all draw data in the selected demo deployment.
 *  Not part of demo setup; use createDemo for a fresh event instead.
 *  npx convex run seed:clearAll
 */
export const clearAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    requireDemoDeployment()
    const tables = ["winnerLogs", "drawSessions", "prizes", "prizeTiers", "participants", "drawEvents"] as const
    const counts: Record<string, number> = {}
    for (const table of tables) {
      const docs = await ctx.db.query(table).collect()
      for (const doc of docs) await ctx.db.delete(doc._id)
      counts[table] = docs.length
    }
    return counts
  },
})
