# Accessibility Audit — Lucky Draw MVP
**Date:** 2026-04-07  
**Standard:** WCAG 2.1 AA  
**Method:** Static code analysis across all UI files

---

## Summary

| Category | Pass | Fail | Notes |
|----------|------|------|-------|
| Images / alt text | N/A | N/A | No `<img>` tags found — icons use lucide-react SVGs |
| Form labels | PARTIAL | — | Labels present but some inputs missing `htmlFor` |
| Color as only convey | — | FAIL | Event status badges use color only |
| Contrast (text) | — | FAIL | Multiple `text-white/25`, `text-white/30` violations |
| Contrast (UI components) | — | FAIL | Low-opacity interactive elements |
| Keyboard navigation | PARTIAL | — | Focus rings exist but suppressed with `focus:outline-none` |
| Focus visible | — | FAIL | `focus:outline-none` used everywhere with insufficient alternative |
| No keyboard traps | PASS | — | No modal overlays or traps found |
| Touch targets (44×44px) | — | FAIL | Trash buttons are ~24px |
| Screen reader dynamic content | — | FAIL | No `aria-live` for draw state changes |
| Skip navigation | — | FAIL | No skip-to-content link |

---

## Detailed Findings

### A11Y-001 — Color is the only means of conveying event status
**Level:** WCAG 1.4.1 (Use of Color) — AA FAIL  
**File:** `app/(dashboard)/events/page.tsx:65-74`

Event status badges use only color to communicate state:
- Green = active
- Yellow = draft  
- Gray = completed (implied)

No icons, no patterns, no text differentiation beyond the word itself. For color-blind users (8% of males), green and yellow are indistinguishable.

**Fix:** Add a status icon alongside the color. Example: `● Active`, `○ Draft`, `✓ Completed` — or use icons from lucide-react (CheckCircle, Clock, Archive).

---

### A11Y-002 — Text contrast violations (multiple locations)
**Level:** WCAG 1.4.3 (Contrast Minimum) — AA FAIL

On `bg-gray-950` (#030712, effectively near-black), the following opacity classes fail minimum contrast:

| Element | Class | Approx Contrast | Required | Result |
|---------|-------|-----------------|----------|--------|
| "No prizes yet" | `text-white/25` | ~1.5:1 | 4.5:1 | FAIL |
| Remote controller note | `text-white/30` | ~1.8:1 | 4.5:1 | FAIL |
| Prize name on remote | `text-white/40` | ~2.4:1 | 4.5:1 | FAIL |
| Secondary labels everywhere | `text-white/40` | ~2.4:1 | 4.5:1 | FAIL |
| Sub-labels (email, Chinese names) | `text-white/25` | ~1.5:1 | 4.5:1 | FAIL |
| Loading/empty state text | `text-white/30` | ~1.8:1 | 4.5:1 | FAIL |

Note: `text-white/50` (~3:1 contrast) is borderline — passes for large text (≥18pt / 14pt bold) but fails for normal text.

**Fix:** 
- Replace `text-white/25` with minimum `text-white/50` for readable content
- Replace `text-white/30` with minimum `text-white/50`  
- `text-white/40` on important text (prize name on remote) should be `text-white` (full)
- Reserve very low opacity values for purely decorative/non-essential elements only

---

### A11Y-003 — Focus indicators suppressed with no alternative
**Level:** WCAG 2.4.7 (Focus Visible) — AA FAIL  
**Files:** All input elements across the codebase

All form inputs use `focus:outline-none focus:border-indigo-500`. The border color change on focus is a 1px border change — this does not meet WCAG 2.4.11 (Focus Appearance, AA in WCAG 2.2) which requires minimum 2px indicator with 3:1 contrast against adjacent colors.

Additionally, interactive buttons (Trash, tier cards, etc.) have no visible focus indicator at all — they only show hover states.

**Fix:** Replace `focus:outline-none` with `focus:outline-2 focus:outline-indigo-500 focus:outline-offset-2`. This provides a clear, visible focus ring that satisfies WCAG requirements.

---

### A11Y-004 — Touch targets below 44×44px
**Level:** WCAG 2.5.5 (Target Size) — AA FAIL  
**Files:** Multiple pages

The trash/delete buttons on prizes, participants, and tiers use `p-1` padding with a `w-4 h-4` (16px) icon. Total tap target is approximately 24×24px — well below the 44×44px minimum.

**Locations:**
- `prizes/page.tsx:56-62` — tier delete button (`p-1`)
- `participants/page.tsx:116-120` — participant remove button (`p-1`)

**Fix:** Change `p-1` to `p-3` on all icon-only action buttons, or use `min-w-[44px] min-h-[44px]` to ensure sufficient tap area.

---

### A11Y-005 — No aria-live region for draw state changes
**Level:** WCAG 4.1.3 (Status Messages) — AA FAIL  
**File:** `components/draw/DrawEngine.tsx`

When a draw is triggered, the winner is announced visually on screen via animation. Screen reader users receive no notification. The state transitions (idle → spinning → result) and the winner's name are never announced.

**Fix:** Add an `aria-live="assertive"` region to DrawEngine that announces the winner when `session.status === "result"`:
```jsx
<div aria-live="assertive" className="sr-only">
  {session.status === "result" && session.winner 
    ? `Winner: ${session.winner.name}` 
    : null}
</div>
```

---

### A11Y-006 — No skip navigation link
**Level:** WCAG 2.4.1 (Bypass Blocks) — AA FAIL  
**File:** `app/(dashboard)/layout.tsx`

There is no "Skip to main content" link at the top of the page. Keyboard and screen reader users must tab through the entire navigation on every page load before reaching page content.

**Fix:** Add a visually hidden skip link as the first element in the layout:
```jsx
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-black focus:px-4 focus:py-2 focus:rounded">
  Skip to main content
</a>
```
And add `id="main-content"` to the `<main>` element.

---

### A11Y-007 — Form inputs missing explicit label association
**Level:** WCAG 1.3.1 (Info and Relationships) — AA PARTIAL  
**File:** `app/(dashboard)/events/[eventId]/branding/page.tsx`

The `<select>` for Language has a `<label>` visually above it but the label does not have a `htmlFor` attribute matching the select's `id`. Without this association, screen readers may not announce the label when the select is focused.

**Fix:** Add `id="locale"` to the select and `htmlFor="locale"` to the label. Apply the same fix to all form labels throughout the app that lack explicit `htmlFor`/`id` pairing.

---

### A11Y-008 — SVG icons not hidden from screen readers
**Level:** WCAG 1.1.1 (Non-text Content) — AA PARTIAL

Lucide React icons are decorative in most uses (e.g., the `<Trophy />`, `<Users />`, `<Download />` icons in the event detail page). They should have `aria-hidden="true"` to prevent screen readers from announcing them as unlabeled graphics.

**Fix:** Add `aria-hidden="true"` to all decorative icon uses. Where icons convey meaning without adjacent text, add `aria-label` to the parent button instead.

---

### PASSES

- **Trash buttons** — correctly have `aria-label` (`aria-label={Remove tier ${tier.name}}`). ✓
- **Participant remove buttons** — have `aria-label`. ✓
- **Draw button** — has `aria-label` that changes based on state. ✓
- **No keyboard traps** — no modals or overlays that could trap focus. ✓
- **Form submit buttons** — labeled with visible text. ✓
- **`required` attribute on event name** — correct HTML5 validation. ✓
- **Large touch target on DRAW button** — `w-52 h-52` circle is excellent. ✓

---

## WCAG AA Checklist

- [ ] All images have alt text (or aria-hidden if decorative) — **N/A (no images), icons need aria-hidden**
- [ ] All form inputs have associated labels — **PARTIAL (missing htmlFor associations)**
- [ ] Color is not the only means of conveying information — **FAIL (status badges)**
- [ ] Minimum 4.5:1 contrast ratio for normal text — **FAIL (multiple violations)**
- [ ] Minimum 3:1 contrast ratio for large text and UI components — **FAIL**
- [ ] All interactive elements reachable by keyboard — **PARTIAL (untested, but no obvious blockers)**
- [ ] Focus is visible at all times — **FAIL (outline suppressed)**
- [ ] No keyboard traps — **PASS**
- [ ] Touch targets are at least 44×44px on mobile — **FAIL (trash buttons)**
- [ ] Screen reader announces dynamic content changes — **FAIL (no aria-live)**
