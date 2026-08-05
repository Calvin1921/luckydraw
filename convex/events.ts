import { mutation, query, internalMutation, action } from "./_generated/server"
import { internal, api } from "./_generated/api"
import { v } from "convex/values"
import { assertOrgOwnership, assertCallerOwnsOrg } from "./_helpers"
import Stripe from "stripe"

const DEFAULT_PRIMARY_COLOR = "#e2a84b"

export const list = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("drawEvents")
      .withIndex("by_org", q => q.eq("orgId", args.orgId))
      .order("desc")
      .collect()

    return Promise.all(
      events.map(async event => {
        const participantCount = (
          await ctx.db
            .query("participants")
            .withIndex("by_event", q => q.eq("eventId", event._id))
            .collect()
        ).length
        const tierCount = (
          await ctx.db
            .query("prizeTiers")
            .withIndex("by_event", q => q.eq("eventId", event._id))
            .collect()
        ).length
        return { ...event, participantCount, tierCount }
      })
    )
  },
})

export const get = query({
  args: { eventId: v.id("drawEvents") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.eventId)
  },
})

export const create = mutation({
  args: {
    orgId: v.id("organizations"),
    name: v.string(),
    nameZh: v.optional(v.string()),
    eventDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertCallerOwnsOrg(ctx, args.orgId) // C1: verify caller owns the org

    if (!args.name.trim()) throw new Error("Name is required")

    return ctx.db.insert("drawEvents", {
      orgId: args.orgId,
      name: args.name.trim(),
      nameZh: args.nameZh?.trim() || undefined,
      eventDate: args.eventDate,
      status: "draft",
      primaryColor: DEFAULT_PRIMARY_COLOR,
      locale: "en",
    })
  },
})

export const updateBranding = mutation({
  args: {
    eventId: v.id("drawEvents"),
    primaryColor: v.string(),
    locale: v.union(v.literal("en"), v.literal("zh-HK"), v.literal("both")),
    logoUrl: v.optional(v.string()),
    drawTheme: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertOrgOwnership(ctx, args.eventId) // C1
    const { eventId, ...branding } = args
    await ctx.db.patch(eventId, branding)
  },
})

export const remove = mutation({
  args: { eventId: v.id("drawEvents") },
  handler: async (ctx, args) => {
    await assertOrgOwnership(ctx, args.eventId) // C1

    // Cascade delete: participants, prizes, tiers, sessions, logs, then event
    const [participants, prizes, tiers, sessions, logs] = await Promise.all([
      ctx.db.query("participants").withIndex("by_event", q => q.eq("eventId", args.eventId)).collect(),
      ctx.db.query("prizes").withIndex("by_event", q => q.eq("eventId", args.eventId)).collect(),
      ctx.db.query("prizeTiers").withIndex("by_event", q => q.eq("eventId", args.eventId)).collect(),
      ctx.db.query("drawSessions").withIndex("by_event", q => q.eq("eventId", args.eventId)).collect(),
      ctx.db.query("winnerLogs").withIndex("by_event", q => q.eq("eventId", args.eventId)).collect(),
    ])

    await Promise.all([
      ...participants.map(p => ctx.db.delete(p._id)),
      ...prizes.map(p => ctx.db.delete(p._id)),
      ...tiers.map(t => ctx.db.delete(t._id)),
      ...sessions.map(s => ctx.db.delete(s._id)),
      ...logs.map(l => ctx.db.delete(l._id)),
    ])

    await ctx.db.delete(args.eventId)
  },
})

/**
 * C2: internalMutation — only callable from the Stripe webhook HTTP action via ctx.runMutation.
 * A public mutation here would allow any authenticated user to activate a license without paying.
 */
export const activateLicense = internalMutation({
  args: {
    eventId: v.id("drawEvents"),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.eventId, {
      status: "active",
      licenseExpiresAt: args.expiresAt,
    })
  },
})

/** Internal — called by createCheckoutSession action after creating the Stripe session */
export const setStripeSession = internalMutation({
  args: {
    eventId: v.id("drawEvents"),
    stripeSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.eventId, { stripeSessionId: args.stripeSessionId })
  },
})

/**
 * Mark an event as completed when all prizes have been awarded.
 * Called from the draw completion flow when allPrizesAwarded is detected.
 * No auth check — same security model as draw operations (physical presence).
 */
export const markCompleted = mutation({
  args: { eventId: v.id("drawEvents") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId)
    if (!event) throw new Error("Event not found")
    // Only advance status — never regress it
    if (event.status === "completed") return
    await ctx.db.patch(args.eventId, { status: "completed" })
  },
})

export const createCheckoutSession = action({
  args: { eventId: v.id("drawEvents") },
  handler: async (ctx, args): Promise<string> => {
    const event = await ctx.runQuery(api.events.get, { eventId: args.eventId })
    if (!event) throw new Error("Event not found")

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: process.env.STRIPE_PER_EVENT_PRICE_ID!,
          quantity: 1,
        },
      ],
      metadata: { eventId: args.eventId },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/events/${args.eventId}?licensed=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/events/${args.eventId}`,
    })

    await ctx.runMutation(internal.events.setStripeSession, {
      eventId: args.eventId,
      stripeSessionId: session.id,
    })

    return session.url!
  },
})
