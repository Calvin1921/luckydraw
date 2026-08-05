import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { assertOrgOwnership } from "./_helpers"

const MAX_PARTICIPANTS = 300
const BULK_IMPORT_CHUNK_SIZE = 500

export const list = query({
  args: { eventId: v.id("drawEvents") },
  handler: async (ctx, args) => {
    await assertOrgOwnership(ctx, args.eventId) // VULN-001: rows carry email/phone — owner only
    return ctx.db
      .query("participants")
      .withIndex("by_event", q => q.eq("eventId", args.eventId))
      .collect()
  },
})

/**
 * Public projection for the draw surfaces. Stage/audience run unauthenticated
 * (physical-presence model), but only need what the animation renders — never
 * email/phone.
 */
export const listForDraw = query({
  args: { eventId: v.id("drawEvents") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("participants")
      .withIndex("by_event", q => q.eq("eventId", args.eventId))
      .collect()
    return rows.map(p => ({
      _id: p._id,
      name: p.name,
      nameZh: p.nameZh ?? null,
      isEligible: p.isEligible,
    }))
  },
})

export const bulkImport = mutation({
  args: {
    eventId: v.id("drawEvents"),
    participants: v.array(
      v.object({
        name: v.string(),
        nameZh: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
      })
    ),
    importSource: v.union(v.literal("csv"), v.literal("external")),
  },
  handler: async (ctx, args) => {
    await assertOrgOwnership(ctx, args.eventId) // C1

    if (args.participants.length > BULK_IMPORT_CHUNK_SIZE) {
      throw new Error(`Chunk too large: max ${BULK_IMPORT_CHUNK_SIZE} participants per call`)
    }

    // REQ-07: enforce MVP participant limit at the Convex layer
    const existing = await ctx.db
      .query("participants")
      .withIndex("by_event", q => q.eq("eventId", args.eventId))
      .collect()

    if (existing.length + args.participants.length > MAX_PARTICIPANTS) {
      throw new Error(
        `Participant limit exceeded: max ${MAX_PARTICIPANTS} per event (currently ${existing.length})`
      )
    }

    await Promise.all(
      args.participants.map(p =>
        ctx.db.insert("participants", {
          eventId: args.eventId,
          name: p.name,
          nameZh: p.nameZh,
          email: p.email,
          phone: p.phone,
          importSource: args.importSource,
          isEligible: true,
        })
      )
    )

    return { imported: args.participants.length }
  },
})

export const add = mutation({
  args: {
    eventId: v.id("drawEvents"),
    name: v.string(),
    nameZh: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertOrgOwnership(ctx, args.eventId) // C1

    if (!args.name.trim()) throw new Error("Name is required")

    // REQ-07: enforce MVP participant limit
    const count = (
      await ctx.db
        .query("participants")
        .withIndex("by_event", q => q.eq("eventId", args.eventId))
        .collect()
    ).length

    if (count >= MAX_PARTICIPANTS) {
      throw new Error(`Participant limit reached: max ${MAX_PARTICIPANTS} per event`)
    }

    return ctx.db.insert("participants", {
      eventId: args.eventId,
      name: args.name.trim(),
      nameZh: args.nameZh?.trim(),
      email: args.email?.trim(),
      phone: args.phone?.trim(),
      importSource: "manual",
      isEligible: true,
    })
  },
})

export const remove = mutation({
  args: { participantId: v.id("participants") },
  handler: async (ctx, args) => {
    const participant = await ctx.db.get(args.participantId)
    if (!participant) throw new Error("Participant not found")
    await assertOrgOwnership(ctx, participant.eventId) // C1
    await ctx.db.delete(args.participantId)
  },
})
