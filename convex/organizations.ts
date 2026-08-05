import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { getCallerClerkOrgId } from "./_helpers"

/**
 * Idempotent upsert — called on every dashboard layout mount after login.
 * clerkOrgId is derived server-side from ctx.auth (REQ-13: never trust client-supplied org ID).
 */
export const ensureOrg = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const clerkOrgId = await getCallerClerkOrgId(ctx)

    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", q => q.eq("clerkOrgId", clerkOrgId))
      .first()

    if (existing) return existing._id

    const slug = clerkOrgId
      .slice(0, 20)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")

    return ctx.db.insert("organizations", {
      clerkOrgId,
      name: args.name.trim(),
      slug,
      plan: "per_event",
    })
  },
})

export const getByClerkOrgId = query({
  args: { clerkOrgId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", q => q.eq("clerkOrgId", args.clerkOrgId))
      .first()
  },
})
