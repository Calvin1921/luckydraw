import { query } from "./_generated/server"
import { v } from "convex/values"
import { assertOrgOwnership } from "./_helpers"

export const listConfirmed = query({
  args: { eventId: v.id("drawEvents") },
  handler: async (ctx, args) => {
    await assertOrgOwnership(ctx, args.eventId) // VULN-002: rows carry participantEmail — owner only
    return ctx.db
      .query("winnerLogs")
      .withIndex("by_event_action", q =>
        q.eq("eventId", args.eventId).eq("action", "confirmed")
      )
      .order("asc")
      .collect()
  },
})
