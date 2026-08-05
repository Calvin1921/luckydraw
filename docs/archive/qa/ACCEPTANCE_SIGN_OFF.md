# Acceptance Sign-Off — Lucky Draw MVP
**Date:** 2026-04-07  
**Method:** Static code analysis of all UI/UX files

---

## Verdict: REJECTED

**Reason:** Three CRITICAL bugs are open. Per acceptance policy, sign-off cannot be granted when any Critical or High severity bug remains unresolved.

---

## Open Critical Issues (Blockers)

| ID | Issue | File | Severity |
|----|-------|------|----------|
| BUG-001 | No back navigation in dashboard — users get stranded on sub-pages | `app/(dashboard)/layout.tsx` | CRITICAL |
| BUG-002 | Draw links shown and functional for draft (unpurchased) events | `app/(dashboard)/events/[eventId]/page.tsx` | CRITICAL |
| BUG-003 | Winner name not shown on remote controller — organizer can't confirm blind | `components/draw/DrawEngine.tsx` | CRITICAL |

---

## Open High Issues (Must Fix Before Acceptance)

| ID | Issue | Severity |
|----|-------|----------|
| BUG-004 | "All prizes awarded" stage screen is a dead end — no navigation | HIGH |
| BUG-005 | Individual prizes cannot be deleted | HIGH |
| BUG-006 | Prize tier draw order cannot be changed after creation | HIGH |
| BUG-007 | Critical workflow instruction ("Remote link on Stage page") at 30% opacity | HIGH |
| BUG-008 | Prize name on remote at 40% opacity — unreadable in bright venue | HIGH |

---

## Accessibility Blockers

| ID | Issue | WCAG | Severity |
|----|-------|------|----------|
| A11Y-002 | Multiple text elements fail 4.5:1 contrast (white/25, white/30) | 1.4.3 AA | HIGH |
| A11Y-003 | Focus indicators suppressed — keyboard users can't see focus | 2.4.7 AA | HIGH |
| A11Y-004 | Touch targets below 44×44px (trash buttons) | 2.5.5 AA | HIGH |
| A11Y-005 | No aria-live — draw results not announced to screen readers | 4.1.3 AA | MEDIUM |

---

## Conditions for Acceptance

The following must be resolved before this build can be accepted:

### Must Fix (Critical + High)
1. Add back navigation / breadcrumbs to all dashboard sub-pages
2. Disable/hide draw links for draft events with clear upgrade CTA
3. Show winner name on remote controller after draw
4. Add navigation + Export Winners button to "All prizes awarded" screen
5. Add delete button for individual prizes within a tier
6. Add tier reordering (up/down buttons or drag)
7. Fix critical instruction visibility (remote link note)
8. Fix prize name visibility on remote

### Must Fix (Accessibility — High)
9. Fix text contrast violations — minimum `text-white/50` for all readable content
10. Replace `focus:outline-none` with visible focus ring across all inputs and buttons
11. Fix touch target size on all icon-only buttons (`p-3` minimum)

### Should Fix Before Ship (Medium)
12. Show CSV import error details (not just count)
13. Add event readiness checklist on event detail page
14. Fix "Session not found" dead-end error with recovery instructions
15. Explain "prize tiers" concept with helper text
16. Fix `min-h-screen` to `min-h-[100dvh]` for Stage and Remote pages (mobile Safari)
17. Add `aria-live` for draw state changes
18. Add skip navigation link

### Nice to Have (Low)
19. Add cancel button on New Event form
20. Add helper text for Chinese event name field
21. Add `aria-hidden="true"` to decorative icons

---

## Retest Requirements

Before re-submitting for acceptance:
1. All CRITICAL and HIGH bugs must be fixed and verified
2. Accessibility fixes (items 9-11) must be verified
3. Live browser testing required on: Chrome, Safari (Mac), Safari (iOS), Firefox
4. Remote flow must be tested end-to-end on a real iPhone

---

## What Works Well

- Empty states exist on all major pages ✓
- Participants page has good CSV import UX (clear button, status feedback) ✓
- Branding page live preview is excellent ✓
- Events list page has proper empty state ✓
- Draw button aria-label updates based on state ✓
- Trash buttons have aria-labels ✓
- DRAW button on remote is large and easy to press (w-52 h-52) ✓
- QR code on Stage page for remote access is the right approach ✓
- Auto-create session on Stage load is good UX ✓
