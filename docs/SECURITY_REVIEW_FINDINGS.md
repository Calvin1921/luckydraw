# Lucky Draw MVP — Security Code Review

**Date:** 2026-04-07  
**Scope:** `luckydraw/` — Convex backend, Next.js middleware, HTTP endpoints, CSV parser

> This is a code-level review of auth, input handling, and data access. No live or
> dynamic testing (scanning, exploitation, fuzzing) was performed — all findings are
> derived from static reading of the source.

---

## Critical Condition Verdicts (C1–C4)

| Condition | Status | Evidence |
|-----------|--------|----------|
| C1 — assertOrgOwnership on every mutation | **PARTIAL PASS** | See detail below |
| C2 — activateLicense as internalMutation | **PASS** | `convex/events.ts:111` |
| C3 — winner projected to {_id, name, nameZh} only | **PASS** | `convex/draw.ts:25-28,34` |
| C4 — CSV export requires Authorization: Bearer | **PASS** | `convex/http.ts:48-51` |

---

## C1 Detail — assertOrgOwnership Coverage

**Passing mutations (ownership checked):**
- `events.create` → `assertCallerOwnsOrg(ctx, args.orgId)` — `events.ts:51`
- `events.updateBranding` → `assertOrgOwnership(ctx, args.eventId)` — `events.ts:75`
- `events.remove` → `assertOrgOwnership(ctx, args.eventId)` — `events.ts:84`
- `participants.bulkImport` → `assertOrgOwnership(ctx, args.eventId)` — `participants.ts:32`
- `participants.add` → `assertOrgOwnership(ctx, args.eventId)` — `participants.ts:77`
- `participants.remove` → `assertOrgOwnership(ctx, participant.eventId)` — `participants.ts:110`
- `prizes.createTier` → `assertOrgOwnership(ctx, args.eventId)` — `prizes.ts:35`
- `prizes.addPrize` → `assertOrgOwnership(ctx, args.eventId)` — `prizes.ts:55`
- `prizes.removeTier` → `assertOrgOwnership(ctx, tier.eventId)` — `prizes.ts:72`
- `draw.createSession` → `assertOrgOwnership(ctx, args.eventId)` — `draw.ts:71`
- `organizations.ensureOrg` → `getCallerClerkOrgId(ctx)` (server-side JWT only) — `organizations.ts:11`

**Remote controller mutations (intentional design exception):**
- `draw.triggerDraw` — uses `remoteToken` validation instead — `draw.ts:99`
- `draw.confirmWinner` — uses `remoteToken` validation instead — `draw.ts:202`
- `draw.rejectWinner` — uses `remoteToken` validation instead — `draw.ts:251`

These three mutations are designed for the unauthenticated phone remote. The `remoteToken` is a `crypto.randomUUID()` (128-bit entropy), only obtainable via `createSession` which requires full ownership. This is architecturally sound. Token revocation is the remaining gap (see VULN-004).

---

## Findings

### [VULN-001] IDOR — Unauthenticated Read of Participant PII (email, phone)
- **CVSS Score:** 7.5 (High)
- **Category:** A01 Broken Access Control
- **Description:** `participants.list` query has no authentication or ownership check. Any client that knows a valid `eventId` can read the full participant list including `email` and `phone`.
- **Steps to reproduce:**
  1. Obtain any valid `drawEvents` document ID (guessable via Convex ID format, or leaked via shared draw URLs)
  2. Call `api.participants.list({ eventId })` from any unauthenticated Convex client
  3. Receive full participant records with `name`, `email`, `phone`
- **Impact:** Full PII exfiltration of all event participants. In HK context, violates PDPO (Personal Data Ordinance).
- **Evidence:** `convex/participants.ts:8-16` — `query({ handler: async (ctx, args) => ctx.db.query(...).collect() })` — no `ctx.auth.getUserIdentity()` call.
- **Remediation:** Add ownership guard to the query, or create a separate public-safe projection that strips email/phone for authenticated-only reads.

```ts
// Fix: add to participants.list handler
const identity = await ctx.auth.getUserIdentity()
if (!identity) throw new Error("Unauthenticated")
// then call assertOrgOwnership
```

---

### [VULN-002] Unauthenticated Read of Winner PII (email) via winnerLogs
- **CVSS Score:** 6.5 (Medium)
- **Category:** A01 Broken Access Control
- **Description:** `winnerLogs.listConfirmed` has no auth check. It returns `participantEmail` for all confirmed winners of any known event.
- **Steps to reproduce:**
  1. Obtain any valid `drawEvents` document ID
  2. Call `api.winnerLogs.listConfirmed({ eventId })` from any unauthenticated client
  3. Receive winner records containing `participantEmail`
- **Impact:** Email exfiltration of prize winners.
- **Evidence:** `convex/winnerLogs.ts:4-15` — no auth check.
- **Remediation:** Add auth + ownership guard, or strip `participantEmail` from the query result if it need not be returned in the public export path.

---

### [VULN-003] events.get / events.list — No Auth Check (Information Disclosure)
- **CVSS Score:** 4.3 (Medium)
- **Category:** A01 Broken Access Control
- **Description:** `events.get` and `events.list` return event details (name, status, licenseExpiresAt, stripeSessionId) without authentication. `events.get` is called by the CSV export HTTP action (`api.events.get`) — this is the reason it lacks auth — but it's also callable publicly.
- **Impact:** Event metadata disclosure; `stripeSessionId` exposure (low risk since Stripe sessions expire).
- **Evidence:** `convex/events.ts:36-41` (get), `convex/events.ts:7-34` (list).
- **Remediation:** Add auth guard to `events.list`. For `events.get`, the HTTP export action already checks auth before calling it — acceptable, but a server-only variant would be cleaner.

---

### [VULN-004] remoteToken Has No Expiry / Rotation Mechanism
- **CVSS Score:** 3.1 (Low)
- **Category:** A07 Authentication Failures
- **Description:** `remoteToken` is assigned at session creation and persists indefinitely. There is no mechanism to rotate or revoke it if the phone remote URL is compromised.
- **Impact:** An attacker with the remoteToken URL can trigger draws, confirm/reject winners at any time until the session is manually closed (session close is not yet implemented).
- **Remediation:** Tie token validity to session status, or add an explicit `revokeRemoteToken` mutation callable by authenticated organizer.

---

### [VULN-005] createCheckoutSession Action — No Ownership Verification
- **CVSS Score:** 2.7 (Low)
- **Category:** A01 Broken Access Control
- **Description:** `events.createCheckoutSession` is an `action` that creates a Stripe checkout for any `eventId` without verifying the caller owns the event.
- **Impact:** Any authenticated user can initiate a payment flow on behalf of another user's event. If completed, `activateLicense` would activate a license the real owner did not initiate. Low severity because (a) the attacker bears the payment cost, (b) activating someone else's license is not harmful to the platform.
- **Evidence:** `convex/events.ts:135-163` — no `assertOrgOwnership` before creating Stripe session.
- **Remediation:** Add `await assertOrgOwnership(ctx, args.eventId)` at start of handler (note: `action` context supports auth identity via `ctx.auth`).

---

## Additional Security Checks

| Check | Result | Notes |
|-------|--------|-------|
| Stripe webhook signature verification | **PASS** | `stripe.webhooks.constructEvent()` called — `http.ts:23` |
| Clerk middleware — `/draw/` routes | **PASS (by design)** | Stage/audience/remote are intentionally public; documented in middleware |
| `_helpers.ts` auth implementations | **PASS** | orgId derived from server-side JWT (`identity.orgId`), not client input |
| CSV injection sanitization | **PASS** | `/^[=+\-@\t\r]/` regex applied in `sanitizeName` — `csv-parser.ts:16-19` |
| `Math.random()` usage | **PASS** | Zero occurrences; only `crypto.getRandomValues` used — `draw.ts:159` |
| Hardcoded secrets in source | **PASS** | `.env.local` is gitignored; `STRIPE_SECRET_KEY` accessed via `process.env` only |
| CSV export Content-Disposition injection | **PASS** | `safeEventName` strips non-alphanumeric — `http.ts:78` |

---

## Verdict

**CLEARED WITH CONDITIONS**

Two HIGH/CRITICAL data exposure vulnerabilities (VULN-001, VULN-002) must be resolved before any production deployment involving real participant PII. The core draw integrity (C1–C4) is sound. Stripe webhook and CSV security are solid.

### Must Fix Before Ship
1. **VULN-001** — Add auth + ownership guard to `participants.list`
2. **VULN-002** — Add auth guard to `winnerLogs.listConfirmed`

### Should Fix Before Ship
3. **VULN-003** — Auth guard on `events.list`

### Can Ship With Known Risk (document in security notes)
4. **VULN-004** — remoteToken expiry
5. **VULN-005** — createCheckoutSession ownership
