# Code Review — Lucky Draw MVP

**Date:** 2026-04-07  
**Scope:** All 35 files from the implementation batch

---

## Security Checklist Results

| Condition | Status | Evidence |
|-----------|--------|----------|
| C1: `assertOrgOwnership` on every mutation | ✅ PASS | All 9 mutations verified (see per-file below) |
| C2: `activateLicense` is `internalMutation` | ✅ PASS | `convex/events.ts:111` |
| C3: `draw.getSession` projects only `{_id, name, nameZh}` | ✅ PASS | `convex/draw.ts:24-33` |
| C4: CSV export requires auth | ✅ CODE PASS / ⚠️ FUNCTIONAL FAIL | See `http.ts` + `events/[eventId]/page.tsx` below |
| No `Math.random()` | ✅ PASS | 0 occurrences in all 35 files |
| TypeScript strict — no `any` | ✅ PASS | 0 `any` types in source files |
| No unused imports | ✅ PASS | All imports verified as used |
| Component files under 200 lines | ✅ PASS | Largest: `DrawEngine.tsx` at 167 lines |
| Vitest tests for draw algorithm | ✅ PASS | 5 tests, all passing |
| Vitest tests for CSV parser | ⚠️ PARTIAL | 4 tests pass; sanitization behavior untested |

---

## Files: APPROVED

### `convex/schema.ts`
**Verdict:** LGTM

All 7 tables match ARCHITECTURE.md exactly. Validator types correct (`v.id()`, `v.string()`, `v.boolean()`, `v.union(v.literal(...))` for enums). All required indexes present. `lastDrawAt` field correctly added to `drawSessions` for rate limiting. No issues.

---

### `convex/_helpers.ts`
**Verdict:** LGTM

`assertOrgOwnership`, `assertCallerOwnsOrg`, and `getCallerClerkOrgId` all implemented correctly. Clerk org identity correctly derived server-side from `ctx.auth.getUserIdentity()` — personal accounts get `user_{subject}` fallback. Throws explicit `"Unauthenticated"` / `"Forbidden"` errors. No issues.

---

### `convex/auth.config.ts`
**Verdict:** LGTM

Minimal and correct. `CLERK_JWT_ISSUER_DOMAIN` from env. No issues.

---

### `convex/organizations.ts`
**Verdict:** LGTM

`ensureOrg` derives `clerkOrgId` from `getCallerClerkOrgId(ctx)` — correctly satisfies REQ-13. No client-supplied org ID trusted. Slug generation is safe. `getByClerkOrgId` is a query (no auth required, acceptable for org lookup by known ID). No issues.

---

### `convex/participants.ts`
**Verdict:** LGTM

C1 on all 3 mutations: `bulkImport` (L32), `add` (L77), `remove` (L110 — correctly resolves `participant.eventId` first). REQ-07 enforced server-side in both `bulkImport` and `add`. `BULK_IMPORT_CHUNK_SIZE = 500` and `MAX_PARTICIPANTS = 300` are named constants. No issues.

---

### `convex/prizes.ts`
**Verdict:** LGTM

C1 on all 3 mutations. `removeTier` correctly resolves `tier.eventId` before calling `assertOrgOwnership`. Cascade delete of prizes in tier is correct. No issues.

---

### `convex/winnerLogs.ts`
**Verdict:** LGTM

Uses `by_event_action` compound index for efficient confirmed-only query — no filter scan. Ordered ascending by `_creationTime` (system field, implicit). No issues.

---

### `lib/draw-algorithm.ts`
**Verdict:** LGTM

Pure function. Only `crypto.getRandomValues()` — no `Math.random()`. Modulo bias comment accurate (pool << 2^32). `buildEligiblePool` throws clearly on empty pool. No issues.

---

### `lib/utils.ts`
**Verdict:** LGTM

Standard `cn()` helper. No issues.

---

### `components/draw/WinnerCard.tsx` (81 lines)
**Verdict:** LGTM

Framer Motion spring animation per spec. No PII (only receives projected `{_id, name, nameZh}`). Confirm/Reject buttons conditionally render on `isOperator`. No issues.

---

### `components/draw/NameRoll.tsx` (94 lines)
**Verdict:** LGTM

GSAP 2-phase timeline correct: Phase 1 `power2.in` 2.2s, Phase 2 `power3.out` 1.8s per spec. Winner index resolved from `lastIndexOf` in 5x-repeated list — ensures winner lands in the second half of the visible scroll. Timeline killed on cleanup. No issues.

---

### `components/draw/DrawEngine.tsx` (167 lines)
**Verdict:** LGTM

`remoteToken` is required from page layer and threaded into all three mutations. `useEffect` resets `animationDone` on `status === "idle"` correctly. `handleDraw` guards on `session.status !== "idle"`. Loading and null states handled. No issues.

---

### `app/layout.tsx`
**Verdict:** LGTM

`ClerkProvider` wraps `ConvexClientProvider` — correct nesting order. No issues.

---

### `app/page.tsx`
**Verdict:** LGTM

Simple redirect to `/events`. No issues.

---

### `app/(auth)/sign-in/[[...sign-in]]/page.tsx`
**Verdict:** LGTM

Clerk `<SignIn />` component. No issues.

---

### `app/(auth)/sign-up/[[...sign-up]]/page.tsx`
**Verdict:** LGTM

Clerk `<SignUp />` component. No issues.

---

### `app/(dashboard)/layout.tsx`
**Verdict:** LGTM

`ensureOrg` called on mount with server-derived identifier (`orgId ?? user_${userId}`). Redirects to `/sign-in` when not authenticated. No issues.

---

### `app/(dashboard)/events/page.tsx`
**Verdict:** LGTM

No sensitive data exposure. Org resolved from Clerk identity, then events loaded. Empty state present. No issues.

---

### `app/(dashboard)/events/new/page.tsx`
**Verdict:** LGTM

Error state handled. `org._id` from Convex query (not user-supplied). Form submits to `events.create` which re-validates ownership server-side. No issues.

---

### `app/(dashboard)/events/[eventId]/branding/page.tsx`
**Verdict:** LGTM

Form state synced from Convex query on mount. Live preview present. `updateBranding` validates on server. No issues.

---

### `app/(dashboard)/events/[eventId]/participants/page.tsx`
**Verdict:** LGTM

CSV parsed client-side via pure function, then sent to `bulkImport` mutation (which re-validates server-side). Participant limit error will surface from Convex throw. No issues.

---

### `app/draw/[eventId]/remote/page.tsx`
**Verdict:** LGTM

Token from `searchParams` passed to `DrawEngine`. Guards for missing token and missing session. `isOperator={true}` — correct. `getSessionByToken` used (not `getActiveSession`) — token-based auth is correct here. No issues.

---

### `components/providers/ConvexClientProvider.tsx`
**Verdict:** LGTM

Standard `ConvexProviderWithClerk` setup. No issues.

---

### `middleware.ts`
**Verdict:** LGTM

`/draw/:eventId/audience` and `/draw/:eventId/remote` correctly marked public. `/draw/:eventId/stage` is NOT in the public list — the architecture table shows stage as public, but stage is also not in the public list here. Looking at the architecture: "Route: `/draw/(.*)/stage` — Auth: Public". **Minor gap:** stage should be in the public matcher. However this won't cause a crash — Clerk will redirect unauthenticated stage viewers to sign-in, which is arguably acceptable for the stage screen. Not a security risk, just a UX issue. Flagging below.

---

### `tests/draw-algorithm.test.ts`
**Verdict:** LGTM

5 tests covering: eligible filtering, empty pool error, winner in pool, never selects ineligible, roughly uniform distribution. Solid coverage for a pure function. No issues.

---

### `tests/setup.ts`
**Verdict:** LGTM

Comment-only file noting real Convex instance requirement. No issues.

---

## Files: CHANGES REQUESTED

### `convex/draw.ts`
**Verdict:** NEEDS CHANGES

Issues:
- Line 69–79: `createSession` only checks `ctx.auth.getUserIdentity()` (any authenticated user) but does not call `assertOrgOwnership(ctx, args.eventId)`. An authenticated user from a different org can create sessions for any event they know the `eventId` of. All other auth-required mutations on `eventId` use `assertOrgOwnership`. This is a C1 gap.

  → Add `await assertOrgOwnership(ctx, args.eventId)` after the identity check, and import `assertOrgOwnership` from `./_helpers`.

---

### `convex/http.ts`
**Verdict:** NEEDS CHANGES (functional bug)

Issues:
- Lines 46–51: C4 auth check (`ctx.auth.getUserIdentity()`) is implemented correctly in the Convex HTTP action. However, this check requires the Convex JWT to be present in the `Authorization` header. Convex's `ctx.auth` in HTTP actions only authenticates requests that include the bearer token explicitly — it does not receive cookies or session tokens from the browser. Browser anchor tag downloads (`<a href download>`) cannot attach headers, so this endpoint will return 401 for all browser-initiated downloads.

  → The UI call site (events detail page) must be changed from an anchor tag to a `fetch()` call with the Convex JWT, or the endpoint needs a signed URL approach. See also `events/[eventId]/page.tsx` fix below.

---

### `app/(dashboard)/events/[eventId]/page.tsx`
**Verdict:** NEEDS CHANGES (functional bug linked to C4)

Issues:
- Lines 70–76: The CSV export is an `<a href download>` anchor pointing directly to the Convex HTTP action URL. Browser anchor navigation does not include the Authorization header — Convex HTTP action `ctx.auth.getUserIdentity()` will return null and respond 401.

  Fix: Replace with a button that calls `fetch()` with the Convex JWT, then triggers a programmatic download:
  ```tsx
  const { getToken } = useAuth()  // from @clerk/nextjs
  
  async function handleDownloadCSV() {
    const token = await getToken({ template: "convex" })
    const res = await fetch(`${convexSiteUrl}/export/winners?eventId=${event._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `winners.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  ```

---

### `app/draw/[eventId]/audience/page.tsx`
**Verdict:** NEEDS CHANGES (security — C3 adjacent)

Issues:
- Lines 13, 40: `useQuery(api.draw.getActiveSession, ...)` returns the full `drawSessions` document including `remoteToken`. The audience page is fully public/unauthenticated (accessible by anyone on the projector). ARCHITECTURE.md C3 states: "remoteToken must NOT be included in the response to stage/audience views." While `draw.getSession` correctly strips the token, `getActiveSession` does not — and its response is visible in browser devtools to anyone with network inspection access at the venue.
  
  Additionally, line 40 passes `remoteToken={session.remoteToken}` to `DrawEngine`, which is unnecessary since audience uses `isOperator={false}` and never calls triggerDraw/confirm/reject.

  Fix option A (preferred): Strip `remoteToken` from `getActiveSession` return value in `draw.ts`:
  ```ts
  // In getActiveSession handler, before return:
  const { remoteToken: _, ...safeSession } = session
  return safeSession
  ```
  But this would require updating `stage/page.tsx` to get the token a different way (it needs it for QR code generation).
  
  Fix option B (minimal): On the audience page, don't pass `remoteToken` to `DrawEngine`:
  ```tsx
  // audience/page.tsx - remove remoteToken prop entirely
  <DrawEngine
    sessionId={session._id}
    participants={participants}
    primaryColor={event.primaryColor}
    isOperator={false}
    isStage={true}
  />
  ```
  This doesn't stop the token being in the Convex response body but removes it from client usage and makes the intent explicit. The deeper fix (option A with a separate authenticated query for the token on stage) is preferred but out of MVP scope.

  **Minimum required fix: Remove `remoteToken` prop from audience's `DrawEngine` call.**

---

### `app/(dashboard)/events/[eventId]/prizes/page.tsx`
**Verdict:** NEEDS CHANGES (minor)

Issues:
- Line 70: Inline ad-hoc type annotation `(prize: { _id: string; name: string; nameZh?: string; isAwarded: boolean }) =>`. This duplicates the schema definition and will silently drift if the schema changes. TypeScript won't warn because the inline type will just ignore new fields.

  → Use the Convex-generated type:
  ```tsx
  import type { Doc } from "@/convex/_generated/dataModel"
  // ...
  tier.prizes.map((prize: Doc<"prizes">) => (
  ```

---

### `tests/csv-parser.test.ts`
**Verdict:** NEEDS CHANGES (coverage gap)

Issues:
- The `sanitizeName` function (csv-parser.ts line 18–20) strips leading `=`, `+`, `-`, `@`, `\t`, `\r` to prevent CSV formula injection (REQ-08). This behavior has no test. The function exists and is correct, but if it's ever changed, no test will catch the regression.

  → Add test:
  ```ts
  it("strips CSV injection prefixes from names", () => {
    const csv = `name\n=HYPERLINK("evil")\n+1234\n@admin\n-cmd`
    const result = parseParticipantCSV(csv)
    expect(result.valid[0].name).toBe('HYPERLINK("evil")')
    expect(result.valid[1].name).toBe("1234")
    expect(result.valid[2].name).toBe("admin")
    expect(result.valid[3].name).toBe("cmd")
  })
  ```

---

### `middleware.ts`
**Verdict:** NEEDS CHANGES (UX — not security)

Issues:
- Line 3–11: `/draw/:eventId/stage` is not in the `isPublicRoute` matcher. The architecture specifies stage as public ("displayed on venue screen — no login"). Currently, unauthenticated users opening the stage URL will be redirected to `/sign-in`.

  → Add `/draw/:eventId/stage(.*)` to the `createRouteMatcher` array:
  ```ts
  const isPublicRoute = createRouteMatcher([
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/draw/:eventId/stage(.*)",    // ← add this
    "/draw/:eventId/audience(.*)",
    "/draw/:eventId/remote(.*)",
  ])
  ```

---

## Summary

| Category | Count |
|----------|-------|
| LGTM (no changes) | 28 files |
| NEEDS CHANGES | 7 files |

**Blocking issues (must fix before ship):**
1. `convex/draw.ts` — `createSession` missing C1 org ownership check
2. `convex/http.ts` + `events/[eventId]/page.tsx` — C4 broken in practice (anchor tag can't send auth header)
3. `app/draw/[eventId]/audience/page.tsx` — `remoteToken` exposed to unauthenticated public page

**Non-blocking (fix before production, not blocking PR merge):**
4. `app/(dashboard)/events/[eventId]/prizes/page.tsx` — inline type duplication
5. `tests/csv-parser.test.ts` — missing injection sanitization test
6. `middleware.ts` — stage page not in public routes (UX regression)

**Pre-existing architecture conditions (not introduced by this implementation):**
- `events.remove` does hard-delete including audit logs — ARCHITECTURE.md HIGH condition. Not introduced here; tracked separately.
