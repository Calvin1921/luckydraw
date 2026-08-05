import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  organizations: defineTable({
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.string(),
    plan: v.union(
      v.literal("per_event"),
      v.literal("agency"),
      v.literal("enterprise")
    ),
  })
    .index("by_clerk_org_id", ["clerkOrgId"])
    .index("by_slug", ["slug"]),

  drawEvents: defineTable({
    orgId: v.id("organizations"),
    name: v.string(),
    nameZh: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("archived")
    ),
    eventDate: v.optional(v.number()),
    licenseExpiresAt: v.optional(v.number()),
    stripeSessionId: v.optional(v.string()),
    // Branding inlined — no normalization penalty in document DB
    primaryColor: v.string(),
    locale: v.union(v.literal("en"), v.literal("zh-HK"), v.literal("both")),
    logoUrl: v.optional(v.string()),
    drawTheme: v.optional(v.string()),
  }).index("by_org", ["orgId"]),

  participants: defineTable({
    eventId: v.id("drawEvents"),
    name: v.string(),
    nameZh: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    importSource: v.union(
      v.literal("manual"),
      v.literal("csv"),
      v.literal("eventrsvp")
    ),
    isEligible: v.boolean(),
  })
    .index("by_event", ["eventId"])
    // Efficient eligible pool query during draws — avoids full-scan filter at scale
    .index("by_event_eligible", ["eventId", "isEligible"]),

  prizeTiers: defineTable({
    eventId: v.id("drawEvents"),
    name: v.string(),
    nameZh: v.optional(v.string()),
    drawOrder: v.number(),
    allowRepeat: v.boolean(),
  }).index("by_event", ["eventId"]),

  prizes: defineTable({
    tierId: v.id("prizeTiers"),
    // Denormalized — avoids tier lookup for event-level prize queries
    eventId: v.id("drawEvents"),
    name: v.string(),
    nameZh: v.optional(v.string()),
    description: v.optional(v.string()),
    isAwarded: v.boolean(),
  })
    .index("by_tier", ["tierId"])
    .index("by_event", ["eventId"]),

  drawSessions: defineTable({
    eventId: v.id("drawEvents"),
    tierId: v.id("prizeTiers"),
    status: v.union(
      v.literal("idle"),
      v.literal("spinning"),
      v.literal("result"),
      v.literal("confirmed"),
      v.literal("rejected"),
      v.literal("closed")
    ),
    remoteToken: v.string(),
    algorithm: v.string(),
    prngSeed: v.optional(v.string()),
    lastDrawAt: v.optional(v.number()),
    currentWinnerId: v.optional(v.id("participants")),
    currentPrizeId: v.optional(v.id("prizes")),
    currentResultId: v.optional(v.id("winnerLogs")),
  })
    .index("by_event", ["eventId"])
    .index("by_remote_token", ["remoteToken"]),

  winnerLogs: defineTable({
    eventId: v.id("drawEvents"),
    sessionId: v.id("drawSessions"),
    participantId: v.id("participants"),
    prizeId: v.id("prizes"),
    // Denormalized — audit trail self-contained even if records are later deleted (PDPO)
    participantName: v.string(),
    participantNameZh: v.optional(v.string()),
    participantEmail: v.optional(v.string()),
    prizeName: v.string(),
    prizeNameZh: v.optional(v.string()),
    tierName: v.string(),
    action: v.union(
      v.literal("drawn"),
      v.literal("confirmed"),
      v.literal("rejected"),
      v.literal("replaced")
    ),
    actorUserId: v.optional(v.string()),
  })
    .index("by_event", ["eventId"])
    // Efficient confirmed-only query for CSV export
    .index("by_event_action", ["eventId", "action"]),
})
