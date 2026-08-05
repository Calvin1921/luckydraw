# Lucky Draw MVP — Security Requirements

> Date: 2026-04-07
> Status: MANDATORY — these are not suggestions

These requirements MUST be implemented before the MVP is considered shippable.
Each requirement maps to a finding in THREAT_MODEL.md.

---

## REQ-01: Org Ownership Verification in All Mutations (CRITICAL)
**Maps to:** S1, T4, E1, E3

Every Convex mutation that reads or writes org-scoped data MUST:
1. Call `ctx.auth.getUserIdentity()` — throw `ConvexError("Unauthenticated")` if null
2. Derive `clerkOrgId` from identity claims (never from args)
3. Look up the caller's org via `by_clerk_org_id` index
4. Verify the target resource (event, participant, prize, session) belongs to that org

**Affected functions:** `events.create`, `events.updateBranding`, `events.remove`, `events.activateLicense`, `participants.bulkImport`, `participants.add`, `participants.remove`, `prizes.createTier`, `prizes.addPrize`, `prizes.removeTier`, `draw.createSession`, `draw.confirmWinner`, `draw.rejectWinner`

**Verification:** Integration tests must demonstrate that a user from Org A cannot read or modify data from Org B, even with a valid Clerk session.

---

## REQ-02: `activateLicense` Must Be an Internal Mutation (CRITICAL)
**Maps to:** E2

`activateLicense` MUST be defined as `internalMutation` (not `mutation`) in Convex. It must only be callable from `http.ts` (the Stripe webhook handler) via `ctx.runMutation(internal.events.activateLicense, ...)`.

No client must be able to call this function directly.

```typescript
// convex/events.ts — REQUIRED pattern
import { internalMutation } from "./_generated/server"

export const activateLicense = internalMutation({
  args: { eventId: v.id("drawEvents"), expiresAt: v.number() },
  handler: async (ctx, args) => { /* ... */ },
})
```

---

## REQ-03: `remoteToken` Must Be Verified on Every Draw Mutation (CRITICAL)
**Maps to:** S2

The `triggerDraw`, `confirmWinner`, and `rejectWinner` mutations (when called from the remote controller) MUST verify the `remoteToken` argument against `drawSession.remoteToken` before executing. A mismatch MUST result in an error with no information leak about why it failed.

The `remoteToken` field MUST be excluded from any query result returned to stage or audience screens. `getSession` and `getActiveSession` must strip this field before returning.

---

## REQ-04: `actorUserId` Derived Server-Side Only (HIGH)
**Maps to:** S3, R2

Remove `actorUserId` from the args of `confirmWinner` and `rejectWinner`. Derive it server-side:

```typescript
const identity = await ctx.auth.getUserIdentity()
const actorUserId = identity?.subject ?? null  // null for unauthenticated remote ops
```

---

## REQ-05: `getSession` Must Not Return PII (HIGH)
**Maps to:** I2

The `getSession`, `getActiveSession`, and `getSessionByToken` queries MUST project the winner object to `{ _id, name, nameZh }` only. Email, phone, importSource, and isEligible MUST be omitted from the returned winner object.

```typescript
const winner = session.currentWinnerId
  ? await ctx.db.get(session.currentWinnerId)
  : null

// Required projection:
const safeWinner = winner
  ? { _id: winner._id, name: winner.name, nameZh: winner.nameZh ?? null }
  : null
```

---

## REQ-06: Winner CSV Export Must Require Authentication (HIGH)
**Maps to:** I1

The `/export/winners` HTTP action MUST be replaced with an authenticated flow:

**Required pattern:**
1. Add a Convex mutation `winnerLogs.generateExportToken` (authenticated, org-verified) that creates a short-lived (15-minute) signed token and stores it in a new `exportTokens` table or as a signed value.
2. The Next.js API route or client fetches using that token.
3. The HTTP action validates the token before serving the CSV.

**Alternative:** Move CSV generation to a Next.js API Route Handler (`app/api/export/winners/route.ts`) where `auth()` from `@clerk/nextjs/server` is called first.

---

## REQ-07: CSV Import Must Enforce 300-Participant Limit (MEDIUM)
**Maps to:** D2

`participants.bulkImport` MUST reject payloads exceeding 300 entries:

```typescript
if (args.participants.length > 300) {
  throw new ConvexError("Import limit is 300 participants per event")
}
```

This check MUST be at the Convex layer. UI-level validation is insufficient.

---

## REQ-08: CSV Injection Sanitization (MEDIUM)
**Maps to:** T2

Both `csv-parser.ts` (import) and the CSV export in `http.ts` (export) MUST sanitize string values that begin with `=`, `+`, `-`, or `@`:

```typescript
function sanitizeCsvCell(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value
}
```

Apply to: `name`, `nameZh`, `email`, `phone` on import; all fields on export.

---

## REQ-09: Stripe Webhook Signature Verification (ALREADY COMPLIANT — VERIFY)
**Maps to:** Stripe security baseline

The plan already includes `stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)`. Verify:
- [ ] Raw body (not parsed JSON) is passed to `constructEvent`
- [ ] `STRIPE_WEBHOOK_SECRET` is set as a Convex environment variable (not `.env.local`)
- [ ] Response returns HTTP 400 on signature failure (already in plan — confirm retained)

---

## REQ-10: Environment Variable Placement (MEDIUM)
**Maps to:** I3

| Variable | Where it MUST live |
|---|---|
| `STRIPE_SECRET_KEY` | Convex dashboard → Environment Variables |
| `STRIPE_WEBHOOK_SECRET` | Convex dashboard → Environment Variables |
| `CLERK_SECRET_KEY` | Vercel → Environment Variables (server-only) |
| `R2_ACCESS_KEY_ID` | Vercel → Environment Variables (server-only) |
| `R2_SECRET_ACCESS_KEY` | Vercel → Environment Variables (server-only) |
| `RESEND_API_KEY` | Vercel → Environment Variables (server-only) |

These must NEVER appear with `NEXT_PUBLIC_` prefix. The `.env.example` file must include comments clarifying which variables are server-only.

---

## REQ-11: Duplicate Session Prevention (LOW)
**Maps to:** D3

`createSession` MUST check for an existing non-closed session for the same `eventId` + `tierId` combination and return it rather than creating a duplicate.

---

## REQ-12: CSPRNG Usage Verification (COMPLIANCE)
**Maps to:** Draw integrity requirement

`crypto.getRandomValues()` (Web Crypto API) is used in `triggerDraw` (Convex mutation — server-side). This is correct. Convex's V8 runtime supports the Web Crypto API server-side.

`Math.random()` is PROHIBITED anywhere in the draw logic path. This is verified by:
- Code review: no `Math.random()` in `draw.ts` or `lib/draw-algorithm.ts`
- Tests in `draw-algorithm.test.ts` verify distribution uniformity

The seed is a 32-bit value from `Uint32Array(1)`. For pools ≤ 300, modulo bias is `300 / 2^32 ≈ 0.000007%` — acceptable. Document this in code comments.

---

## REQ-13: `ensureOrg` Must Use Identity Claims, Not Client Args (HIGH)
**Maps to:** S1

The `ensureOrg` mutation currently accepts `clerkOrgId` as a client arg. This MUST be changed to derive the org ID from `ctx.auth.getUserIdentity()`:

```typescript
export const ensureOrg = mutation({
  args: { name: v.string() },  // Remove clerkOrgId from args
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new ConvexError("Unauthenticated")
    const clerkOrgId = identity.orgId ?? `user_${identity.subject}`
    // ... rest of upsert logic using server-derived clerkOrgId
  },
})
```
