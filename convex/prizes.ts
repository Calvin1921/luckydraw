import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { assertOrgOwnership } from "./_helpers"

export const listTiers = query({
  args: { eventId: v.id("drawEvents") },
  handler: async (ctx, args) => {
    const tiers = await ctx.db
      .query("prizeTiers")
      .withIndex("by_event", q => q.eq("eventId", args.eventId))
      .collect()

    // Sort by drawOrder so reordering takes effect
    tiers.sort((a, b) => a.drawOrder - b.drawOrder)

    return Promise.all(
      tiers.map(async tier => {
        const prizes = await ctx.db
          .query("prizes")
          .withIndex("by_tier", q => q.eq("tierId", tier._id))
          .collect()
        return { ...tier, prizes }
      })
    )
  },
})

export const createTier = mutation({
  args: {
    eventId: v.id("drawEvents"),
    name: v.string(),
    nameZh: v.optional(v.string()),
    drawOrder: v.number(),
    allowRepeat: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await assertOrgOwnership(ctx, args.eventId) // C1
    return ctx.db.insert("prizeTiers", {
      eventId: args.eventId,
      name: args.name.trim(),
      nameZh: args.nameZh?.trim(),
      drawOrder: args.drawOrder,
      allowRepeat: args.allowRepeat ?? false,
    })
  },
})

export const addPrize = mutation({
  args: {
    tierId: v.id("prizeTiers"),
    eventId: v.id("drawEvents"),
    name: v.string(),
    nameZh: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertOrgOwnership(ctx, args.eventId) // C1
    return ctx.db.insert("prizes", {
      tierId: args.tierId,
      eventId: args.eventId,
      name: args.name.trim(),
      nameZh: args.nameZh?.trim(),
      description: args.description?.trim(),
      isAwarded: false,
    })
  },
})

export const removePrize = mutation({
  args: { prizeId: v.id("prizes") },
  handler: async (ctx, args) => {
    const prize = await ctx.db.get(args.prizeId)
    if (!prize) throw new Error("Prize not found")
    await assertOrgOwnership(ctx, prize.eventId) // C1
    await ctx.db.delete(args.prizeId)
  },
})

export const removeTier = mutation({
  args: { tierId: v.id("prizeTiers") },
  handler: async (ctx, args) => {
    const tier = await ctx.db.get(args.tierId)
    if (!tier) throw new Error("Tier not found")
    await assertOrgOwnership(ctx, tier.eventId) // C1

    const prizes = await ctx.db
      .query("prizes")
      .withIndex("by_tier", q => q.eq("tierId", args.tierId))
      .collect()
    await Promise.all(prizes.map(p => ctx.db.delete(p._id)))
    await ctx.db.delete(args.tierId)
  },
})

/**
 * Swap drawOrder of two adjacent tiers.
 * direction "up" = lower drawOrder (drawn earlier), "down" = higher drawOrder (drawn later).
 */
export const reorderTier = mutation({
  args: {
    tierId: v.id("prizeTiers"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  handler: async (ctx, args) => {
    const tier = await ctx.db.get(args.tierId)
    if (!tier) throw new Error("Tier not found")
    await assertOrgOwnership(ctx, tier.eventId) // C1

    const allTiers = await ctx.db
      .query("prizeTiers")
      .withIndex("by_event", q => q.eq("eventId", tier.eventId))
      .collect()
    allTiers.sort((a, b) => a.drawOrder - b.drawOrder)

    const idx = allTiers.findIndex(t => t._id === args.tierId)
    const swapIdx = args.direction === "up" ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= allTiers.length) return // already at boundary

    const swapWith = allTiers[swapIdx]
    const tempOrder = tier.drawOrder
    await ctx.db.patch(args.tierId, { drawOrder: swapWith.drawOrder })
    await ctx.db.patch(swapWith._id, { drawOrder: tempOrder })
  },
})
