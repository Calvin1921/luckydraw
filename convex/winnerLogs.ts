import { query } from "./_generated/server"
import { v } from "convex/values"

export const listConfirmed = query({
  args: { eventId: v.id("drawEvents") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("winnerLogs")
      .withIndex("by_event_action", q =>
        q.eq("eventId", args.eventId).eq("action", "confirmed")
      )
      .order("asc")
      .collect()
  },
})
