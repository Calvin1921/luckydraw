# Cross-Browser Test Matrix — Lucky Draw MVP
**Date:** 2026-04-07  
**Method:** Static code analysis + known browser compatibility risks  
**Note:** Live browser testing not performed (no running dev server). This matrix identifies risk areas from code analysis.

---

## Technology Stack Compatibility Assessment

| Technology | Chrome | Firefox | Safari | Edge | Mobile Safari | Mobile Chrome |
|------------|--------|---------|--------|------|---------------|---------------|
| Next.js 14 App Router | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Convex real-time (WebSocket) | ✓ | ✓ | ✓* | ✓ | ✓* | ✓ |
| Framer Motion | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| react-qr-code (SVG-based) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `<input type="color">` | ✓ | ✓ | RISK | ✓ | FAIL | ✓ |
| CSS `backdrop-filter` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| CSS `min-h-screen` with mobile browser chrome | ✓ | ✓ | RISK | ✓ | RISK | ✓ |
| Clerk auth (UserButton) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

*Safari WebSocket: generally stable but known quirks with reconnection behavior.

---

## Known Risk Areas

### RISK-001 — `<input type="color">` on iOS Safari
**Severity:** MEDIUM  
**File:** `app/(dashboard)/events/[eventId]/branding/page.tsx:48-51`

iOS Safari renders `<input type="color">` as a system color picker, which has a completely different UI from desktop. The custom styling (`w-12 h-12 rounded-xl`) will not render as expected on iOS — the input will show as a small colored swatch. The hex text input alongside it will still function.

**Impact:** Branding page color picker may be hard to use on iPhone for organizers who prefer to set up on mobile.

---

### RISK-002 — `min-h-screen` on mobile Safari with browser chrome
**Severity:** MEDIUM  
**Files:** `app/draw/[eventId]/stage/page.tsx`, `remote/page.tsx`

`min-h-screen` in mobile Safari does not account for the browser's address bar chrome, which can cause layouts to overflow or appear cut off at the bottom. The Stage and Remote pages rely heavily on `min-h-screen` for their full-screen layouts.

**Impact:** On iPhones, the DRAW button or Confirm/Reject buttons might be partially hidden behind browser chrome.

**Fix:** Use `min-h-[100dvh]` (dynamic viewport height) instead of `min-h-screen` on the Stage and Remote pages.

---

### RISK-003 — WebSocket reconnection on Safari
**Severity:** LOW  
**Scope:** All Convex real-time queries

Safari has historically had stricter WebSocket handling. During an event, if the organizer's iPhone (running the Remote) goes to sleep and wakes up, the Convex WebSocket connection may not reconnect instantly. This could cause the Remote to be unresponsive for 2-10 seconds after waking the phone.

**Impact:** During live event, organizer presses DRAW and nothing happens for a few seconds. Could cause confusion.

**Fix:** Convex SDK handles reconnection automatically; no code change needed. Mitigation: keep phone screen on during events. Consider adding a connection status indicator.

---

### RISK-004 — CSS `select` element styling on Safari
**Severity:** LOW  
**File:** `app/(dashboard)/events/[eventId]/branding/page.tsx:63-71`

The `<select>` element uses `bg-white/10` background. On Safari, `<select>` elements have limited CSS styling support — the background color may not apply, showing a system default appearance (white background) instead of the dark theme.

**Impact:** Visual inconsistency on Branding page in Safari, but functional.

**Fix:** Add `appearance-none` to the select and add a custom dropdown chevron icon.

---

## Stage Page — Fullscreen Considerations

The Stage page is designed for a projector/large screen. Key risks:
- **Chrome fullscreen API** — not implemented in the app; users must manually press F11 or use browser fullscreen. This works across all browsers.
- **QR code visibility at scale** — an 88px QR code rendered on a 1920×1080 screen from 3m away should be scannable, but is borderline.

---

## Mobile-Specific Tests Required

| Test | Priority | Notes |
|------|----------|-------|
| Remote page on iPhone 13+ | CRITICAL | Primary organizer device during event |
| Remote page on older Android | HIGH | Common in HK |
| Stage page on iPad (projector laptop) | HIGH | Common presentation setup |
| Branding page on iPhone | MEDIUM | Color picker iOS behavior |
| Participants CSV import on iPad | MEDIUM | File picker behavior |

---

## Formal Browser Testing Status

| Browser | Version | Tested | Result |
|---------|---------|--------|--------|
| Chrome (Mac) | Latest | NO — requires running app | Pending |
| Firefox (Mac) | Latest | NO | Pending |
| Safari (Mac) | Latest | NO | Pending |
| Edge (Windows) | Latest | NO | Pending |
| Safari (iOS 17) | Latest | NO | Pending — CRITICAL for remote |
| Chrome (Android) | Latest | NO | Pending |

**Formal browser testing cannot be completed without a running dev server. The above risk analysis is based on static code review. Live testing across at minimum Chrome, Safari (iOS), and Firefox is REQUIRED before acceptance sign-off.**
