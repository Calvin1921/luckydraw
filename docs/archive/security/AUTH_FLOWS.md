# Lucky Draw MVP — Auth Flows

> Date: 2026-04-07

---

## 1. Authentication Stack

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (Client)                     │
│                                                          │
│  ClerkProvider                                           │
│    └── ConvexProviderWithClerk                           │
│          └── useAuth() → Clerk JWT token                 │
└──────────────┬──────────────────────────────────────────┘
               │  JWT (RS256, signed by Clerk)
               │  Claims: sub, org_id, org_role, email
               ▼
┌─────────────────────────────────────────────────────────┐
│                     Convex Cloud                         │
│                                                          │
│  auth.config.ts → validates JWT against Clerk JWKS      │
│  ctx.auth.getUserIdentity() → typed identity object     │
│    .subject      = Clerk userId (sub claim)             │
│    .orgId        = Clerk orgId (if org-scoped session)  │
│    .orgRole      = "org:admin" | "org:member"           │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Session Flow: Authenticated Organizer

```
User visits /events
      │
      ▼
middleware.ts (Clerk middleware)
  isPublicRoute? NO
      │
      ▼
auth.protect() → redirect to /sign-in if no session
      │
      ▼ (has valid Clerk session)
Clerk issues JWT (15-minute expiry, auto-refreshed by SDK)
      │
      ▼
ConvexProviderWithClerk injects JWT into every Convex call
      │
      ▼
Convex function: ctx.auth.getUserIdentity()
  → returns ClerkIdentity with orgId + subject
      │
      ▼
Mutation verifies: org.clerkOrgId === identity.orgId
      │
      ▼ (match)
Mutation proceeds
```

---

## 3. Token Lifecycle

| Token | Issuer | Storage | TTL | Refresh |
|---|---|---|---|---|
| Clerk JWT | Clerk | Memory (SDK-managed) | 15 min | Auto (SDK) |
| Clerk Session Cookie | Clerk | httpOnly cookie | 30 days | Clerk SDK |
| remoteToken (UUID) | Convex (`createSession`) | URL parameter | Until session closed | None — single-use per session |
| Stripe webhook signature | Stripe | Header only | Per-request | N/A |

**Token storage rules:**
- Clerk JWTs: managed by `@clerk/nextjs` SDK — NEVER stored in localStorage or sessionStorage by application code
- `remoteToken`: lives in the URL of the remote controller page. Never persisted to localStorage. Never displayed on stage or audience screens.
- No custom JWT or session tokens are issued by the application.

---

## 4. Public Route Auth Boundary

The Clerk middleware marks these routes as public (no sign-in required):

```
/sign-in/**        — Clerk auth UI
/sign-up/**        — Clerk auth UI  
/draw/*/stage      — Venue display (intentionally public)
/draw/*/audience   — Projector screen (intentionally public)
/draw/*/remote     — Phone controller (protected by remoteToken only)
/api/webhooks/**   — Stripe webhook (protected by stripe-signature)
```

**Important:** "Public route" means Clerk middleware does not enforce a session. It does NOT mean these routes are fully open — they have their own access controls:

- `stage` and `audience`: read-only Convex queries. Must only return non-PII data (name/nameZh only, no email/phone).
- `remote`: write access protected by `remoteToken` UUID validated server-side on every mutation call.
- `webhooks/stripe`: protected by Stripe signature verification.

---

## 5. Convex Auth Integration Pattern

Every mutation that modifies data MUST follow this pattern:

```typescript
import { mutation } from "./_generated/server"
import { ConvexError } from "convex/values"

export const myMutation = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    // Step 1: Authenticate
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new ConvexError("Unauthenticated")

    // Step 2: Resolve caller's org
    const clerkOrgId = identity.orgId ?? `user_${identity.subject}`
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_org_id", q => q.eq("clerkOrgId", clerkOrgId))
      .first()
    if (!org) throw new ConvexError("Organization not found")

    // Step 3: Verify resource ownership
    const event = await ctx.db.get(args.eventId)
    if (!event || event.orgId !== org._id) {
      throw new ConvexError("Not found") // Generic — don't leak existence
    }

    // Step 4: Proceed with operation
    // ...
  },
})
```

**Exception:** `ensureOrg` mutation — called on first login before an org record exists. It MUST still authenticate (step 1) and use the identity's `orgId` as the `clerkOrgId`, not a client-supplied value.

---

## 6. Remote Controller Authorization (No Clerk Session)

The remote controller page has no Clerk session requirement. Authorization flows through `remoteToken`:

```
Operator creates draw session (authenticated)
      │
      ▼
createSession mutation (authenticated) → generates crypto.randomUUID()
      │
      ▼
remoteToken stored in drawSessions.remoteToken
      │
      ▼
Operator opens /draw/[eventId]/remote?token=[remoteToken] on phone
      │
      ▼
Remote page calls triggerDraw({ sessionId, remoteToken })
      │
      ▼
triggerDraw mutation:
  1. Fetches session by sessionId
  2. Verifies session.remoteToken === args.remoteToken  ← MANDATORY CHECK
  3. Verifies session.status === "idle"
  4. Proceeds with CSPRNG draw
```

**The `remoteToken` check on every mutation call is a hard security requirement.**

---

## 7. Authorization Model (RBAC)

| Role | Source | Permissions |
|---|---|---|
| `org:admin` | Clerk org role | Create/delete events, manage participants, trigger draw, confirm/reject winners, export CSV |
| `org:member` | Clerk org role | Manage participants, trigger draw, confirm/reject winners |
| `anonymous` (stage/audience) | No session | Read-only: view active session state (name/nameZh only) |
| `remote-operator` | remoteToken | Trigger draw, confirm winner, reject winner for that session only |

**Organization isolation rule:** An `org:admin` of Org A has zero access to Org B's data, even if they know Org B's `eventId`. Enforced by org ownership check in every mutation.

---

## 8. Stripe Webhook Auth Flow

```
Stripe sends POST /webhooks/stripe
      │
      ▼
Convex HTTP action reads raw body + stripe-signature header
      │
      ▼
stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)
  → throws if signature invalid or expired (5-minute tolerance)
      │
      ▼ (valid)
Extract eventId from session.metadata.eventId
      │
      ▼
Call ctx.runMutation(api.events.activateLicense, ...)
  where activateLicense is an internalMutation (not callable by clients)
```

**`STRIPE_WEBHOOK_SECRET` must be set as a Convex environment variable (not `.env.local`), so it is available in Convex cloud functions.**
