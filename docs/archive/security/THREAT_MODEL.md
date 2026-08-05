# Lucky Draw MVP — Threat Model (STRIDE)

> Date: 2026-04-07
> Scope: Lucky Draw MVP — Next.js 15 + Convex + Clerk + Stripe

---

## Attack Surface Summary

| Surface | Public? | Auth Required | Notes |
|---|---|---|---|
| `/sign-in`, `/sign-up` | Yes | No | Clerk-managed |
| `/events/**` (dashboard) | No | Clerk JWT | Protected by middleware |
| `/draw/[eventId]/stage` | **Yes** | No | Intentional — venue display |
| `/draw/[eventId]/audience` | **Yes** | No | Intentional — projector screen |
| `/draw/[eventId]/remote` | **Yes** | No | Controlled by `remoteToken` UUID only |
| Convex mutations (all) | No | Convex JWT | Must verify identity server-side |
| `/webhooks/stripe` (HTTP action) | Yes | Stripe signature | Must verify `stripe-signature` header |
| `/export/winners` (HTTP action) | **Yes** | None designed | **Gap: no auth on winner export** |

---

## SPOOFING

### S1 — Organizer Identity Spoofing in Convex Mutations
- **Asset at risk:** Any organizer's events, participants, draw sessions
- **Attack vector:** Attacker passes a victim's `orgId` or `eventId` as a mutation argument. The plan's Convex functions (`organizations.ts`, `events.ts`, `participants.ts`, `draw.ts`) contain **zero calls to `ctx.auth.getUserIdentity()`** — they trust caller-supplied IDs entirely.
- **Current mitigations:** Convex requires a valid JWT from Clerk to call authenticated functions
- **Residual risk:** HIGH
- **Required mitigation:** Every mutation that writes or reads org-scoped data MUST call `ctx.auth.getUserIdentity()`, extract the caller's Clerk org ID from the token claims, and verify the target resource belongs to that org before proceeding. This is an IDOR (Insecure Direct Object Reference) class vulnerability.

### S2 — Remote Controller Spoofing (Unauthorized Draw Trigger)
- **Asset at risk:** Draw integrity — attacker forces an unwanted draw or replaces a winner
- **Attack vector:** Attacker enumerates or guesses the `remoteToken` UUID to gain remote controller access
- **Current mitigations:** `remoteToken` is generated with `crypto.randomUUID()` — cryptographically random 128-bit UUID (2^122 effective entropy). Guessing is computationally infeasible.
- **Residual risk:** LOW
- **Required mitigation:** (1) Never expose `remoteToken` on stage or audience screens. (2) Do not log `remoteToken` in server logs. (3) `triggerDraw` mutation must validate that the caller holds a valid token via `by_remote_token` index lookup before executing.

### S3 — `actorUserId` Spoofing in Winner Confirmation
- **Asset at risk:** Audit log integrity — attacker claims to be a different user in winner logs
- **Attack vector:** `confirmWinner` and `rejectWinner` accept `actorUserId` as a client-supplied `v.optional(v.string())` argument. Any client can pass any string.
- **Current mitigations:** None
- **Residual risk:** MEDIUM
- **Required mitigation:** Remove `actorUserId` from mutation arguments. Derive it server-side from `ctx.auth.getUserIdentity()?.subject` instead. If the action is unauthenticated (remote controller), log `actorUserId: null` explicitly.

---

## TAMPERING

### T1 — Draw Result Manipulation (Client-Side Winner Selection)
- **Asset at risk:** Fair draw outcome
- **Attack vector:** Client sends a mutation with a pre-chosen `winnerId`, or intercepts and replaces the server response
- **Current mitigations:** `triggerDraw` runs entirely server-side in Convex. The winner is selected server-side using `crypto.getRandomValues()`. No winner data comes from the client.
- **Residual risk:** LOW
- **Required mitigation:** Maintain current design — winner selection must remain in `triggerDraw` mutation, never in client code. The `lib/draw-algorithm.ts` pure function is for unit testing only and must not be called client-side for actual draws.

### T2 — CSV Injection via Participant Import
- **Asset at risk:** Event organizer's spreadsheet application (when they open the exported winner CSV)
- **Attack vector:** Attacker uploads a CSV with participant names starting with `=`, `+`, `-`, or `@` (e.g., `=HYPERLINK("http://evil.com","Click")`). This gets written to the database and re-exported to the winner CSV, executing when the organizer opens it in Excel/Google Sheets.
- **Current mitigations:** `csv-parser.ts` validates name is non-empty but does not strip formula injection prefixes
- **Residual risk:** MEDIUM
- **Required mitigation:** In `csv-parser.ts`, sanitize any field value that starts with `=`, `+`, `-`, or `@` by prepending a single quote `'` or stripping the character. Apply to all string fields (name, nameZh, email, phone). Also apply sanitization in the CSV export function in `http.ts`.

### T3 — Prize Award Status Tampering
- **Asset at risk:** Prize inventory — awarding the same prize twice
- **Attack vector:** Race condition: two `confirmWinner` mutations execute concurrently before either patches `isAwarded: true`
- **Current mitigations:** Convex mutations run within a serializable transaction context — concurrent mutations on the same document are serialized
- **Residual risk:** LOW
- **Required mitigation:** None beyond current design — Convex's transactional guarantees prevent this.

### T4 — Participant Eligibility Tampering
- **Asset at risk:** Draw fairness — ineligible participant wins
- **Attack vector:** Attacker calls `bulkImport` or `add` mutation for an event they don't own, adding a favored participant
- **Current mitigations:** None — mutations don't verify org membership (see S1)
- **Residual risk:** HIGH
- **Required mitigation:** Addressed by S1 fix — org ownership check on all participant mutations.

---

## REPUDIATION

### R1 — Disputed Draw Result (No Audit Trail on Seed)
- **Asset at risk:** Trust in draw fairness
- **Attack vector:** Winner or audience disputes the draw result, claiming it was manipulated
- **Current mitigations:** `winnerLogs` table records drawn/confirmed/rejected actions with timestamps. `prngSeed` (hex) is stored in `drawSessions`.
- **Residual risk:** LOW
- **Required mitigation:** Ensure `prngSeed` is always stored on `triggerDraw`. Log the `algorithm` field value (`"fisher-yates-webcrypto-v1"`) in `winnerLogs` as well, so the log record is self-contained for auditing.

### R2 — Winner Confirmation Without Actor Identity
- **Asset at risk:** Accountability for who confirmed/rejected a winner
- **Attack vector:** Operator disputes having confirmed a winner; log shows `actorUserId: null`
- **Current mitigations:** `actorUserId` field exists in `winnerLogs`
- **Residual risk:** MEDIUM
- **Required mitigation:** See T3 (S3) — derive `actorUserId` server-side from Clerk JWT claims.

---

## INFORMATION DISCLOSURE

### I1 — Winner CSV Export Unauthenticated
- **Asset at risk:** Participant PII (names) and prize data
- **Attack vector:** Anyone who knows (or guesses) a valid `eventId` can download the full winner list from `/export/winners?eventId=...` — no auth required.
- **Current mitigations:** None — the HTTP action has no auth check
- **Residual risk:** HIGH
- **Required mitigation:** The `/export/winners` endpoint MUST verify that the caller owns the event. Options: (1) require a signed short-lived download token generated by an authenticated mutation, or (2) move export behind a Next.js API route with Clerk session verification. Option 1 is preferred since Convex HTTP actions can't read Clerk session cookies directly.

### I2 — PII in Convex Queries (Stage/Audience Screens)
- **Asset at risk:** Participant emails and phone numbers visible to audience
- **Attack vector:** Stage/audience screens call `getSession` which returns the full winner object including email and phone fields
- **Current mitigations:** The `getSession` query returns the full participant document
- **Residual risk:** MEDIUM
- **Required mitigation:** `getSession` must project winner data to only: `{ _id, name, nameZh }`. Never return email or phone to unauthenticated screens.

### I3 — Stripe Secret Key Exposure
- **Asset at risk:** Stripe account access
- **Attack vector:** `STRIPE_SECRET_KEY` used in `http.ts` — must remain server-side only
- **Current mitigations:** Key is used in a Convex HTTP action (server-side). The `.env.example` names it without `NEXT_PUBLIC_` prefix.
- **Residual risk:** LOW
- **Required mitigation:** Confirm `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are set in the Convex dashboard environment variables (not in `.env.local`). These must never appear in client-side bundles.

### I4 — PRNG Seed Visible to Audience
- **Asset at risk:** Pre-draw winner prediction
- **Attack vector:** `prngSeed` is stored in `drawSessions` and returned by `getSession` — any audience member subscribing to the session can see it
- **Current mitigations:** The seed is only set after the draw occurs (during `triggerDraw`) — the result is already visible before the seed is set, so it cannot be used for prediction
- **Residual risk:** LOW
- **Required mitigation:** No action needed — seed is set after selection, not before. Document this explicitly in `draw.ts` comments.

---

## DENIAL OF SERVICE

### D1 — Draw Trigger Spam (Remote Controller Rate Abuse)
- **Asset at risk:** Draw session integrity, Convex function invocation costs
- **Attack vector:** Attacker with the remote URL spams `triggerDraw` mutations, forcing repeated draws and depleting the prize pool
- **Current mitigations:** `triggerDraw` validates `status === "idle"` before running — once a draw fires, status becomes `"result"` blocking further draws until confirmed/rejected
- **Residual risk:** LOW
- **Required mitigation:** The state machine guard is sufficient. Optionally add a 2-second cooldown enforced server-side on the session document.

### D2 — CSV Import DoS (Oversized Payload)
- **Asset at risk:** Convex function execution time, database
- **Attack vector:** Attacker uploads a CSV with 10,000+ rows, causing `bulkImport` to insert thousands of documents, hitting Convex mutation limits
- **Current mitigations:** MVP gate specifies 300 max participants but no server-side enforcement
- **Residual risk:** MEDIUM
- **Required mitigation:** `bulkImport` mutation MUST reject payloads where `args.participants.length > 300` with a clear error. Enforce at the Convex layer, not just the UI.

### D3 — Concurrent Session Creation
- **Asset at risk:** Draw session state
- **Attack vector:** Two operators call `createSession` simultaneously for the same event/tier
- **Current mitigations:** None — two sessions can exist for the same tier
- **Residual risk:** LOW
- **Required mitigation:** `createSession` should check for an existing non-closed session for the same `eventId` + `tierId` and return the existing one instead of creating a duplicate.

---

## ELEVATION OF PRIVILEGE

### E1 — Cross-Org Data Access (IDOR)
- **Asset at risk:** Another organizer's events, participants, winners, and prize data
- **Attack vector:** Authenticated user passes a valid `eventId` belonging to a different org. Since no mutation verifies org membership, the operation succeeds.
- **Current mitigations:** None
- **Residual risk:** HIGH
- **Required mitigation:** This is the highest priority finding. Every mutation and sensitive query MUST implement an org ownership check. Pattern:

```typescript
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new ConvexError("Unauthenticated");
const clerkOrgId = identity.orgId ?? `user_${identity.subject}`;
const org = await ctx.db.query("organizations")
  .withIndex("by_clerk_org_id", q => q.eq("clerkOrgId", clerkOrgId))
  .first();
if (!org) throw new ConvexError("Organization not found");
// Then verify: event.orgId === org._id
```

### E2 — License Activation Without Payment
- **Asset at risk:** SaaS revenue — organizer activates event without paying
- **Attack vector:** Attacker calls `activateLicense` mutation directly (bypassing Stripe checkout) since the mutation accepts any `eventId` and `expiresAt`
- **Current mitigations:** `activateLicense` is currently a public mutation with no auth check beyond Clerk authentication
- **Residual risk:** HIGH
- **Required mitigation:** `activateLicense` must be called ONLY from the Stripe webhook HTTP action, not exposed as a direct callable mutation. Move it to an internal Convex function (using `internalMutation`) accessible only from `http.ts`. This prevents any client from self-activating licenses.

### E3 — Participant Eligibility Override
- **Asset at risk:** Draw fairness
- **Attack vector:** Attacker calls `remove` mutation on a participant they don't own, eliminating a legitimate participant from the draw
- **Current mitigations:** None — org ownership not verified (see E1)
- **Residual risk:** HIGH
- **Required mitigation:** Addressed by E1 fix.
