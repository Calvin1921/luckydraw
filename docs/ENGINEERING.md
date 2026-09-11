# Engineering evidence and current boundaries

This guide describes the implementation inspected for the portfolio refresh. Historical plans and review reports in this repo can describe different behavior; use source and current checks as evidence.

## Product decisions visible in the code

| User need | Evidence | Qualification |
|---|---|---|
| Keep the host and displays aligned | [`convex/draw.ts`](../convex/draw.ts), [`DrawEngine`](../components/draw/DrawEngine.tsx), and the [remote](../app/draw/[eventId]/remote/page.tsx) use reactive session queries. | Stage/audience discover the active session and DrawEngine subscribes to `getSession`; remote uses `getRemoteSession`. Shared result state does not mean frame-perfect animation sync. |
| Avoid accidental awards | The remote requires two taps to confirm/reject; server mutations validate status and token. Draws have a three-second minimum interval. | Token checks are insufficient while public queries expose tokens. The interval is per session, not global abuse protection. |
| Explain what happened | `triggerDraw`, `confirmWinner` and `rejectWinner` insert drawn/confirmed/rejected logs with participant and prize snapshots. | Confirmed results are shown through [`winnerLogs.listConfirmed`](../convex/winnerLogs.ts). There is no complete audit-history UI, verified actor attribution or tamper-evident ledger. |
| Handle an unclaimed result | Reject returns the session to idle without awarding the prize. | Rejected guests remain eligible. Repeat exclusion applies to confirmed winners within the current tier, not across the whole event. |
| Support different users and devices | [`NovaDraw`](../components/draw/NovaDraw.tsx) uses [`useReducedMotion`](../lib/hooks.ts); dashboard includes a skip link; the remote labels controls. | No fresh screen-reader or WCAG conformance audit was performed for this documentation change. |
| Explain waiting and failure | Events, participants and prizes have loading/empty states; route error boundaries offer recovery; remote mutations surface errors. | These are source-level findings, not proof of offline recovery or successful reconnect under load. |
| Keep setup repeatable | [`seed:createDemo`](../convex/seed.ts) creates a fresh event atomically with fictional labels and returns routes. | Requires a disposable deployment with explicit server demo mode. Existing events are preserved; partial/used events cannot be reseeded. |

## Winner selection: current behavior

The live mutation in `convex/draw.ts` selects an eligible participant using a Web Crypto random 32-bit integer modulo pool size. It **does not call** the Fisher–Yates helper in [`lib/draw-algorithm.ts`](../lib/draw-algorithm.ts), although the session algorithm label still says `fisher-yates-webcrypto-v1`. The helper’s unit tests do not certify the live selection path.

Modulo selection has a small distribution bias when the pool size does not divide the random range. Before making fairness guarantees, unify the live algorithm and its label, use unbiased selection, and test the actual mutation. A recorded seed and result are not sufficient for independent replay without the eligible pool and algorithm version.

## Security and production boundaries

**Use this version as an isolated fake-data demo.** These limits are visible in current code, not hypothetical assurances:

- `getRemoteSession` and `getActiveSession` return session tokens to unauthenticated callers who know the event ID. The public remote route can obtain a token. `getSession` strips its token, but that does not protect the other query paths. An event ID is not organizer authorization.
- `createSession` and `startTier` are public mutations. A production flow needs organizer authorization, event/tier ownership validation, scoped remote capabilities and a revocation/expiry policy. Test public projections across **all** routes and queries.
- Owner checks in [`_helpers.ts`](../convex/_helpers.ts) protect private participant lists and confirmed logs when bypass is off. Public display queries intentionally expose participant display names. Those names still warrant consent and retention decisions for real events.
- `NEXT_PUBLIC_DEV_BYPASS_AUTH` and Convex `DEV_BYPASS` are configuration switches, not production-enforced safeguards. The seed utilities are now **internal** and additionally require explicit demo mode; do not reuse a bypass deployment for real data.
- Logs can retain participant contact fields copied from imported data. The fake seed writes none. Production work needs retention/deletion rules and authenticated actor attribution; do not call the current log immutable or compliance-ready.
- [`convex/http.ts`](../convex/http.ts) implements authenticated winner export. It is not a reliable bypass-mode demo step. Payment/export paths need separate validation from the core draw.

Before a real event: close remote authorization gaps, remove bypass configuration, verify live algorithm behavior, then rehearse simultaneous actions, exhausted pools, interrupted connections, reloads and projector/phone accessibility. The repo includes load-test scripts, but this refresh makes no throughput or availability claims.

## Validation and visual design

`pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` are the configured checks. Unit/integration tests cover the draw helper, CSV parsing, private-data access and demo seeding. Passing them does not constitute a complete live-event test.

Nova’s motion serves the prize reveal; reduced motion uses a separate static path. The split-flap ceremony is a standalone design prototype, not part of the shipped workflow. Historical imagery and animation review notes remain in the repo for context, outside the primary reviewer path.
