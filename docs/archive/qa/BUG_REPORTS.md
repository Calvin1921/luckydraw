# Bug Reports — Lucky Draw MVP
**Date:** 2026-04-07

---

## BUG-001 — No back navigation anywhere in dashboard
**Severity:** CRITICAL  
**Area:** Navigation — all dashboard pages

**Steps to reproduce:**
1. Sign in and open any event
2. Click "Prizes"
3. Try to navigate back to the event detail page

**Expected:** A back button or breadcrumb to return to the parent page.  
**Actual:** No back button exists. The only escape is the "Lucky Draw" logo which goes all the way to `/events`, discarding the user's context.

**File:** `app/(dashboard)/layout.tsx:28-33` — nav has no breadcrumb slot.  
**Fix:** Add breadcrumb to the dashboard layout or add `← Back to [Parent]` links to each sub-page. Minimum viable fix: add `← Back to Event` link at the top of prizes, participants, and branding pages.

---

## BUG-002 — Draw links visible and clickable in draft (unpurchased) events
**Severity:** CRITICAL  
**Area:** Event detail page

**Steps to reproduce:**
1. Create a new event (status = "draft")
2. On the event detail page, observe "Draw Stage (fullscreen)" link is visible
3. Click it — the stage page opens and attempts to auto-create a draw session

**Expected:** Draft events should not show functional draw links. Either disable the links with a tooltip ("Purchase license to unlock"), or hide them entirely.  
**Actual:** Draw links are always shown. The license warning appears below the links as an afterthought. A confused user may click the stage link and end up in a non-functional state.

**File:** `app/(dashboard)/events/[eventId]/page.tsx:66-110` — draw links rendered unconditionally.  
**Fix:** Wrap draw links section with `event.status !== "draft"` check, or render links as disabled with a lock icon and tooltip.

---

## BUG-003 — Winner name not shown on remote controller
**Severity:** CRITICAL  
**Area:** Remote page → DrawEngine remote view

**Steps to reproduce:**
1. Open Stage page on a laptop
2. Scan QR code with phone to open Remote
3. Press DRAW — winner is selected
4. Look at the phone Remote screen

**Expected:** The winner's name is prominently displayed on the phone so the organizer can confirm or reject.  
**Actual:** The winner's name is NOT shown on the remote. The remote only shows "DRAWN" on the button and Confirm/Reject buttons. The organizer must look at the stage screen to read the winner's name.

**File:** `components/draw/DrawEngine.tsx:70-110` — remote view does not render `session.winner`.  
**Fix:** Add winner name display to the remote view when `session.status === "result"`. Should be large text, high contrast, above the Confirm/Reject buttons.

---

## BUG-004 — "All prizes awarded" stage screen is a dead end
**Severity:** HIGH  
**Area:** Stage page end state

**Steps to reproduce:**
1. Complete all prize draws
2. The stage screen shows "All prizes awarded."

**Expected:** A button or link to return to the dashboard, plus a CTA to export winners.  
**Actual:** Full black screen with just the text "All prizes awarded." No navigation, no next steps.

**File:** `app/draw/[eventId]/stage/page.tsx:37-40`  
**Fix:** Add "Back to Dashboard" and "Export Winners" buttons on this screen.

---

## BUG-005 — Individual prizes cannot be deleted
**Severity:** HIGH  
**Area:** Prize setup

**Steps to reproduce:**
1. Open a prize tier
2. Add a prize with a typo (e.g., "Iphone 15")
3. Try to delete just that prize

**Expected:** A delete button on each prize item.  
**Actual:** Only tiers can be deleted (whole tier with all prizes). Individual prizes have no delete action. The only fix is to delete the entire tier and re-add everything.

**File:** `app/(dashboard)/events/[eventId]/prizes/page.tsx:68-86` — prize rows have no remove button.  
**Fix:** Add a remove mutation to `api.prizes` and a trash icon button on each prize row (same pattern as the tier-level delete).

---

## BUG-006 — Prize tier draw order cannot be changed
**Severity:** HIGH  
**Area:** Prize setup

**Steps to reproduce:**
1. Create tier "3rd Prize" (drawOrder=1)
2. Create tier "2nd Prize" (drawOrder=2)
3. Create tier "Grand Prize" (drawOrder=3)
4. Try to reorder them

**Expected:** Drag-to-reorder or up/down buttons to change draw order.  
**Actual:** No reordering. The draw will run 3rd → 2nd → Grand, which is wrong for most events (typically Grand Prize last for drama).

**File:** `app/(dashboard)/events/[eventId]/prizes/page.tsx` — no reorder UI; `createTier` hardcodes `drawOrder: tiers.length + 1`.  
**Fix:** Add up/down reorder buttons (or drag handle) with a `updateTierOrder` mutation.

---

## BUG-007 — "Remote controller link is shown on the Stage page" instruction is nearly invisible
**Severity:** HIGH  
**Area:** Event detail page

**Steps to reproduce:**
1. Open any event detail page
2. Look at the "Draw Links" section

**Expected:** The instruction about finding the remote link on the Stage page is readable.  
**Actual:** The text is styled `text-white/30 text-sm` — 30% opacity on a near-black background. It is extremely low contrast and easy to miss.

**File:** `app/(dashboard)/events/[eventId]/page.tsx:91`  
**Fix:** Change to `text-white/60` minimum, or turn this into an info callout box with an icon. This is critical workflow information.

---

## BUG-008 — Prize name displayed at 40% opacity on remote
**Severity:** HIGH  
**Area:** Remote controller

**Steps to reproduce:**
1. Open Remote page on a phone
2. Look at the current prize name displayed above the DRAW button

**Expected:** The prize name is clearly readable.  
**Actual:** Prize name is `text-white/40 text-lg` — 40% white on black. In a bright venue or on a phone screen with auto-brightness, this will be unreadable.

**File:** `components/draw/DrawEngine.tsx:73-76`  
**Fix:** Change to `text-white text-xl font-semibold` — full opacity, larger, bolder.

---

## BUG-009 — CSV import errors show no details
**Severity:** MEDIUM  
**Area:** Participants import

**Steps to reproduce:**
1. Import a CSV with some invalid rows
2. See status: "Imported 5, 3 errors skipped"

**Expected:** Show which rows/names failed and why (e.g., "Row 3: missing name").  
**Actual:** Only the count of errors is shown. User cannot fix the CSV without guessing.

**File:** `app/(dashboard)/events/[eventId]/participants/page.tsx:29-41`  
**Fix:** Surface the `errors` array from `parseParticipantCSV` and display the first 5 error messages in a collapsible list below the status message.

---

## BUG-010 — No setup checklist / readiness indicator on event detail page
**Severity:** MEDIUM  
**Area:** Event detail page

**Steps to reproduce:**
1. Create an event with no participants and no prizes
2. View the event detail page

**Expected:** An indicator showing what's still needed before the draw can run (e.g., "Add at least 1 participant", "Add at least 1 prize", "Purchase license").  
**Actual:** The page shows the 3 setup cards (Participants, Prizes, Branding) and draw links with no indication of whether the event is ready.

**Fix:** Add a readiness checklist section that checks: has participants (> 0), has prizes (> 0), has active license. Show green checkmarks or red warnings.

---

## BUG-011 — No cancel button on "New Event" form
**Severity:** LOW  
**Area:** New event creation

**Steps to reproduce:**
1. Click "New Event" by accident
2. Try to go back without creating an event

**Expected:** A "Cancel" button linking back to `/events`.  
**Actual:** No cancel button. Must use browser back.

**File:** `app/(dashboard)/events/new/page.tsx:45-88`  
**Fix:** Add `<Link href="/events">Cancel</Link>` below the form submit button.

---

## BUG-012 — No explanation of prize "tiers" concept
**Severity:** MEDIUM  
**Area:** Prize setup

**Steps to reproduce:**
1. Open the Prizes page for the first time

**Expected:** A brief explanation of what tiers are and the recommended setup workflow.  
**Actual:** Page title "Prize Tiers" with no explanation. "Tiers" is jargon that non-technical HK event organizers may not understand.

**Fix:** Add a subtitle: "Create prize groups (e.g. 3rd Prize, 2nd Prize, Grand Prize). Prizes are drawn in the order shown below." Rename "Prize Tiers" to "Prizes" or "Prize Groups" in the page heading.

---

## BUG-013 — "Session not found or expired" remote error is a dead end
**Severity:** MEDIUM  
**Area:** Remote page

**Steps to reproduce:**
1. Open a remote link after the session has changed or expired

**Expected:** An error message with guidance (e.g., "Return to Stage and scan the QR code again").  
**Actual:** "Session not found or expired." — black screen, no navigation.

**File:** `app/draw/[eventId]/remote/page.tsx:43-47`  
**Fix:** Add context: "Return to the Stage screen and scan the QR code again to get a fresh link." Add a "Back to Dashboard" link.

---

## BUG-014 — Stage page silently auto-creates draw session with no user feedback
**Severity:** LOW  
**Area:** Stage page

**Steps to reproduce:**
1. Open Stage page for an event with prizes and no active session

**Expected:** Some indication that the session is being initialized.  
**Actual:** The `useEffect` silently fires `createSession`. The user sees "Loading..." briefly then the draw screen appears. No indication of what happened.

**File:** `app/draw/[eventId]/stage/page.tsx:20-26`  
**Fix:** This is largely fine UX — auto-init is preferable. Low priority. Optionally show "Initializing draw session..." during the creation window.
