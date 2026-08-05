# Lucky Draw — Migration Plan

> **Platform:** Convex
> Convex does not use SQL migrations. Schema is defined in `convex/schema.ts` and pushed via `npx convex dev` or `npx convex deploy`. Convex handles schema validation at write time — it does not block reads of documents that predate a schema change.
>
> "Migrations" in Convex = ordered schema.ts changes + data backfill mutations when needed.

---

## Migration Philosophy for Convex

1. **Additive changes** (new table, new optional field) — push schema, done. No data migration needed.
2. **Making optional → required** — backfill existing docs first, then change schema.
3. **Removing a field** — remove from schema (Convex ignores extra fields in existing docs), then run cleanup if storage matters.
4. **Renaming** — add new field (optional), backfill, make required, remove old field. Four-step process.
5. **New index** — add to schema.ts, push. Convex builds the index on existing data automatically.

---

## Migration 001 — Initial Schema (MVP Launch)

**File:** `luckydraw/convex/schema.ts`
**Status:** Green-field; no existing data to migrate.

```typescript
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
    primaryColor: v.string(),
    locale: v.union(
      v.literal("en"),
      v.literal("zh-HK"),
      v.literal("both")
    ),
    logoUrl: v.optional(v.string()),
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
      v.literal("external")
    ),
    isEligible: v.boolean(),
  })
    .index("by_event", ["eventId"])
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
    .index("by_event_action", ["eventId", "action"]),
})
```

**Deploy command:**
```bash
cd luckydraw
npx convex dev     # development
npx convex deploy  # production
```

**Validation:** After push, Convex dashboard should show all 7 tables. Run `npx convex data` to confirm.

**Reversibility:** Delete all tables in Convex dashboard. Since this is the initial migration on a new project, this is safe.

---

## Migration 002 — Post-MVP: Add `participantCount` to drawEvents (example)

This is a hypothetical post-MVP migration to illustrate the Convex migration pattern for a **backfill-required** change.

**Scenario:** Add a denormalized `participantCount` field to `drawEvents` for fast display in the event list without querying participants.

**Step 1:** Add field as optional:
```typescript
// In drawEvents table definition:
participantCount: v.optional(v.number()),
```
Push schema. Existing events have `undefined` for this field.

**Step 2:** Write a one-time backfill mutation in `convex/migrations.ts`:
```typescript
export const backfillParticipantCount = internalMutation({
  handler: async (ctx) => {
    const events = await ctx.db.query("drawEvents").collect()
    for (const event of events) {
      const count = await ctx.db
        .query("participants")
        .withIndex("by_event", q => q.eq("eventId", event._id))
        .collect()
      await ctx.db.patch(event._id, { participantCount: count.length })
    }
  },
})
```
Run via Convex dashboard or `npx convex run migrations:backfillParticipantCount`.

**Step 3:** Make required:
```typescript
participantCount: v.number(),
```
Push schema. All existing docs now have the value set.

**Step 4:** Remove backfill mutation from codebase.

---

## Schema Change Checklist (for future engineers)

Before making a schema change:

- [ ] Is this additive (new optional field/table)? → push directly, no migration needed
- [ ] Does this remove or rename a field? → check all mutations and queries that read this field
- [ ] Does this change optional → required? → write backfill mutation first
- [ ] Does this add an index? → push directly; Convex builds index on existing docs automatically
- [ ] Does this change an index? → drop old index name, add new one — Convex handles the rebuild
- [ ] Does this affect `winnerLogs`? → winnerLogs are immutable audit records; extra caution required
