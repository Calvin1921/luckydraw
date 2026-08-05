import type { QueryCtx, MutationCtx } from "./_generated/server"
import type { Id } from "./_generated/dataModel"

// Helper context type — MutationCtx.db (DatabaseWriter) structurally extends QueryCtx.db (DatabaseReader)
type ReadableCtx = QueryCtx | MutationCtx

/**
 * Verifies the authenticated caller owns the org that owns the given event.
 * Throws "Unauthenticated" (401), "Event not found" (404), or "Forbidden" (403).
 *
 * C1 requirement: call this in every mutation that takes an eventId or orgId.
 */
export async function assertOrgOwnership(
  ctx: ReadableCtx,
  eventId: Id<"drawEvents">
): Promise<void> {
  // DEV BYPASS — skip auth in local dev when DEV_BYPASS=true
  if (process.env.DEV_BYPASS === "true") return

  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new Error("Unauthenticated")

  const event = await ctx.db.get(eventId)
  if (!event) throw new Error("Event not found")

  const org = await ctx.db.get(event.orgId)
  if (!org) throw new Error("Organization not found")

  // Clerk JWT: orgId is present for org-context requests; absent for personal accounts
  const callerClerkOrgId =
    (identity.orgId as string | undefined) ?? `user_${identity.subject}`

  if (org.clerkOrgId !== callerClerkOrgId) throw new Error("Forbidden")
}

/**
 * Verifies the authenticated caller owns the given org directly.
 * Use for mutations that accept orgId as an argument (e.g., events.create).
 */
export async function assertCallerOwnsOrg(
  ctx: ReadableCtx,
  orgId: Id<"organizations">
): Promise<void> {
  if (process.env.DEV_BYPASS === "true") return

  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new Error("Unauthenticated")

  const org = await ctx.db.get(orgId)
  if (!org) throw new Error("Organization not found")

  const callerClerkOrgId =
    (identity.orgId as string | undefined) ?? `user_${identity.subject}`

  if (org.clerkOrgId !== callerClerkOrgId) throw new Error("Forbidden")
}

/**
 * Derives the caller's Clerk org ID from the JWT identity.
 * Used in ensureOrg (REQ-13: never trust client-supplied clerkOrgId).
 */
export async function getCallerClerkOrgId(ctx: ReadableCtx): Promise<string> {
  if (process.env.DEV_BYPASS === "true") return "dev_bypass_org"
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new Error("Unauthenticated")
  return (identity.orgId as string | undefined) ?? `user_${identity.subject}`
}
