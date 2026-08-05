# Lucky Draw — TODO Tracker

> **HISTORICAL SNAPSHOT (2026-04-08)** — the bug/debt tracker from the original MVP
> build, kept as process evidence. Items P0/P1 listed here were resolved in later
> development (draw flow works end to end; VULN-001/002 patched 2026-08-05 — see
> [SECURITY_REVIEW_FINDINGS.md](./SECURITY_REVIEW_FINDINGS.md)). Remaining items
> should be read as a point-in-time backlog, not current status.

---

## Priority Legend

| Level | Meaning |
|-------|---------|
| **P0** | Showstopper — blocks all usage |
| **P1** | Security — blocks production with real PII |
| **P2** | Critical UX — blocks user-facing release |
| **P3** | High UX — fix before first paying customer |
| **P4** | Medium — fix before production |
| **P5** | Accessibility — WCAG AA compliance |

---

## P0 — Showstoppers (2)

| ID | Issue | File | Source |
|----|-------|------|--------|
| SDET-C1 | `crypto.getRandomValues` unavailable in Convex runtime — `triggerDraw` throws on every draw attempt. **Draw is 100% broken.** | `convex/draw.ts:159` | SDET audit |
| SDET-C2 | No `closeSession` mutation — after Tier 1 prizes exhausted, old session stays active, blocking Tier 2 creation. **Multi-tier draws permanently broken.** | `convex/draw.ts` | SDET audit |

---

## P1 — Security (5)

| ID | CVSS | Issue | File | Source |
|----|------|-------|------|--------|
| VULN-001 | 7.5 | `participants.list` has no auth — full PII exfiltration (email, phone). PDPO violation. | `convex/participants.ts:8-16` | SECURITY_REVIEW_FINDINGS |
| VULN-002 | 6.5 | `winnerLogs.listConfirmed` has no auth — winner email leak. | `convex/winnerLogs.ts:4-15` | SECURITY_REVIEW_FINDINGS |
| VULN-003 | 4.3 | `events.get` / `events.list` no auth — metadata + stripeSessionId disclosure. | `convex/events.ts:7-41` | SECURITY_REVIEW_FINDINGS |
| VULN-004 | 3.1 | `remoteToken` has no expiry/rotation mechanism. | `convex/draw.ts` | SECURITY_REVIEW_FINDINGS |
| VULN-005 | 2.7 | `createCheckoutSession` has no ownership check — any authenticated user can create Stripe session for another org's event. | `convex/events.ts:135-163` | SECURITY_REVIEW_FINDINGS |

---

## P2 — Critical UX (6)

| ID | Issue | File | Source |
|----|-------|------|--------|
| SDET-C3 | `getSessionByToken` returns full session including `remoteToken` — leaks token back to caller. | `convex/draw.ts:41-49` | SDET audit |
| SDET-C4 | `getActiveSession` leaks `remoteToken` to unauthenticated stage/audience screens — enables draw manipulation. | `convex/draw.ts:51-61` | SDET audit |
| SDET-C5 | No error handling on mutation calls in DrawEngine — errors silently swallowed. User sees nothing when DRAW fails. | `components/draw/DrawEngine.tsx:47-59` | SDET audit |
| UX-C1 | No back navigation anywhere — every sub-page is a dead end. Only escape is the logo. | `app/(dashboard)/layout.tsx:28-33` | BUG_REPORTS (BUG-001) |
| UX-C2 | Draw links visible and functional for draft (unpurchased) events — leads to broken experience. | `events/[eventId]/page.tsx:66-110` | BUG_REPORTS (BUG-002) |
| UX-C3 | Winner name NOT shown on remote controller — organizer must look at stage screen to see who won. | `components/draw/DrawEngine.tsx:70-110` | BUG_REPORTS (BUG-003) |

---

## P3 — High UX + Bugs (10)

| ID | Issue | File | Source |
|----|-------|------|--------|
| SDET-H1 | Session auto-creation race condition — `useEffect` guard passes when `session === undefined` (loading), causing duplicate sessions. | `stage/page.tsx:20-26` | SDET audit |
| SDET-H2 | `NameRoll` animation fails silently if winner not in participant list — stage permanently stuck. | `components/draw/NameRoll.tsx:30` | SDET audit |
| SDET-H3 | `confirmWinner` writes corrupted audit log if participant/prize deleted between draw and confirm. | `convex/draw.ts:209-230` | SDET audit |
| SDET-H4 | Stage loading guard doesn't include `session` — shows "All prizes awarded" prematurely. | `stage/page.tsx:28-42` | SDET audit |
| SDET-H5 | QR code defaults to `localhost:3000` if `NEXT_PUBLIC_APP_URL` not set — remote inaccessible in prod. | `stage/page.tsx:45-46` | SDET audit |
| UX-H1 | "All prizes awarded" screen is a black dead end — no navigation, no Export Winners CTA. | `stage/page.tsx:36-40` | BUG_REPORTS (BUG-004) |
| UX-H2 | Individual prizes cannot be deleted — only entire tiers. | `prizes/page.tsx, prizes.ts` | BUG_REPORTS (BUG-005) |
| UX-H3 | Prize tier draw order cannot be changed after creation. | `prizes/page.tsx` | BUG_REPORTS (BUG-006) |
| UX-H4 | Remote controller instruction is `text-white/30` — nearly invisible critical workflow info. | `events/[eventId]/page.tsx:91` | BUG_REPORTS (BUG-007) |
| UX-H5 | Prize name on remote is `text-white/40` — unreadable in bright venue. | `DrawEngine.tsx:73-75` | BUG_REPORTS (BUG-008) |

---

## P4 — Medium + Tech Debt (8)

| ID | Issue | File | Source |
|----|-------|------|--------|
| SDET-M1 | `triggerDraw` uses `by_event` index instead of `by_event_eligible` — unused compound index. | `convex/draw.ts:113` | SDET audit |
| SDET-M2 | `getActiveSession` collects all sessions then filters in JS — grows linearly. | `convex/draw.ts:53` | SDET audit |
| SDET-M3 | `rejectWinner` does not clear `currentResultId` — dangling reference after reject. | `convex/draw.ts:280` | SDET audit |
| SDET-M4 | `DrawEngine` double-subscribes to Convex when used from remote page. | `remote/page.tsx + DrawEngine.tsx` | SDET audit |
| BUG-009 | CSV import errors show no details — user can't fix the CSV. | `participants/page.tsx:29-41` | BUG_REPORTS |
| BUG-010 | No setup checklist / readiness indicator on event detail page. | `events/[eventId]/page.tsx` | BUG_REPORTS |
| BUG-012 | No explanation of prize "tiers" concept — jargon for non-technical users. | `prizes/page.tsx` | BUG_REPORTS |
| BUG-013 | "Session not found" remote error is a dead end — no guidance. | `remote/page.tsx:43-47` | BUG_REPORTS |

**Tech Debt:**
- `lib/draw-algorithm.ts` is dead code — not imported by `triggerDraw` (inlined in mutation)
- Add `by_event_status` index to `drawSessions` schema
- Framer Motion (~50KB) replaceable with CSS transitions for simpler animations
- `actorUserId` not implemented in confirm/reject mutations — audit trail gap
- `events.remove` hard-deletes `winnerLogs` — irrecoverable audit trail destruction

---

## P5 — Accessibility (8 findings)

| ID | WCAG | Issue | Source |
|----|------|-------|--------|
| A11Y-001 | 1.4.1 | Color is the only means of conveying event status (green/yellow badges). | ACCESSIBILITY_AUDIT |
| A11Y-002 | 1.4.3 | Text contrast violations — `text-white/25`, `/30`, `/40` all fail 4.5:1. | ACCESSIBILITY_AUDIT |
| A11Y-003 | 2.4.7 | Focus indicators suppressed with `focus:outline-none`, no adequate alternative. | ACCESSIBILITY_AUDIT |
| A11Y-004 | 2.5.5 | Touch targets below 44x44px — trash buttons ~24px. | ACCESSIBILITY_AUDIT |
| A11Y-005 | 4.1.3 | No `aria-live` region for draw state changes / winner announcements. | ACCESSIBILITY_AUDIT |
| A11Y-006 | 2.4.1 | No skip navigation link. | ACCESSIBILITY_AUDIT |
| A11Y-007 | 1.3.1 | Form inputs missing explicit `htmlFor`/`id` label association. | ACCESSIBILITY_AUDIT |
| A11Y-008 | 1.1.1 | SVG icons not hidden from screen readers with `aria-hidden`. | ACCESSIBILITY_AUDIT |

---

## Cross-Browser Risks (4)

| ID | Severity | Risk | Source |
|----|----------|------|--------|
| RISK-001 | MEDIUM | `<input type="color">` renders differently on iOS Safari — branding page color picker. | CROSS_BROWSER_MATRIX |
| RISK-002 | MEDIUM | `min-h-screen` doesn't account for mobile Safari browser chrome — DRAW button may be hidden. Fix: use `min-h-[100dvh]`. | CROSS_BROWSER_MATRIX |
| RISK-003 | LOW | Safari WebSocket reconnection delays (2-10s) after phone sleep — remote may feel unresponsive. | CROSS_BROWSER_MATRIX |
| RISK-004 | LOW | CSS `select` styling ignored on Safari — branding page dropdown shows system default. | CROSS_BROWSER_MATRIX |

---

## Open Questions

| Question | Context |
|----------|---------|
| Venue projector compatibility | Some venues use locked-down kiosk browsers. Test on Chrome 80+, Safari 14+. |
| Venue WiFi drop mid-draw | Convex handles reconnection, but what if operator phone loses connection during draw? |
| PDPO data retention | What is the retention schedule for participant PII? When should events auto-archive? |
| Draw fairness disputes | CSPRNG + audit seed logged — but is this sufficient for enterprise compliance? |
| License expiry timezone edge | Grace period needed: license valid until end of `eventDate` calendar day HKT? |
| Convex `crypto` alternative | SDET-C1 requires a Convex-compatible CSPRNG. Options: use Convex's built-in `Math.random()`, or move draw selection to an `action` that has access to Node crypto. |
