# Exploratory Test Report — Lucky Draw MVP
**Date:** 2026-04-07  
**Scope:** Full UX audit — navigation, prize setup, draw flow, empty/loading/error states  
**Target User:** Non-technical event organizer in Hong Kong

---

## Session 1: Navigation & Information Architecture

### Test Scope
All dashboard pages, back navigation, breadcrumbs.

### Key Observations

**1. No back navigation anywhere in the app.**
The dashboard layout (`app/(dashboard)/layout.tsx:28-33`) only renders a "Lucky Draw" logo linking to `/events` and a `UserButton`. There are no breadcrumbs and no back buttons on any sub-page. Every inner page (`/events/[id]`, `/events/[id]/prizes`, `/events/[id]/participants`, `/events/[id]/branding`) is a dead end — the only escape is clicking the top-left logo to go all the way back to the events list.

**2. Event detail page has no breadcrumb or "← Back to Events" link.**
`app/(dashboard)/events/[eventId]/page.tsx:43-111` — The page starts immediately with the event name. A user on the prizes/participants/branding sub-pages cannot navigate back to the event detail page without using the browser back button.

**3. Sub-pages (Prizes, Participants, Branding) have no parent link.**
`app/(dashboard)/events/[eventId]/prizes/page.tsx:39` — Starts with `<h1>Prize Tiers</h1>`. No breadcrumb. No link to parent event. Same for participants and branding pages.

---

## Session 2: New Event Creation Flow

### Test Scope
`/events/new` — form, validation, post-submit navigation.

### Key Observations

**4. No back/cancel button on New Event form.**
`app/(dashboard)/events/new/page.tsx:45-88` — Just a form. No "Cancel" button linking back to `/events`. A user who accidentally clicked "New Event" has no way to cancel gracefully — they must use the browser back button.

**5. No context about what "Event Name (Chinese)" is for.**
The form has English + Chinese name fields but no helper text explaining why both are useful (e.g., "Used on bilingual draw screens"). First-time users will skip it without understanding the purpose.

**6. Event date is optional with no explanation.**
The date field is not required. No hint about what happens if it's omitted.

---

## Session 3: Prize Setup Flow

### Test Scope
`/events/[eventId]/prizes` — full tier + prize creation workflow.

### Key Observations

**7. "Tier" concept is unexplained — this is jargon.**
The page title is "Prize Tiers" with no explanation. An event organizer in HK understands "1st Prize", "2nd Prize", not "tiers". There is no tooltip, no description, no help text.

**8. The page structure is bottom-heavy and backwards.**
The flow is: (1) scroll to bottom, (2) add a tier, (3) scroll up to find the new tier, (4) add prizes inside it. For a user with no prior knowledge, this is completely non-obvious. The "Add Tier" form appearing at the bottom, below a large empty area, creates cognitive friction.

**9. "Tiers are drawn in the order you add them" is the only instruction — and it's in an empty state.**
`prizes/page.tsx:44-46` — Once a tier is added, this instruction disappears entirely. There's no permanent indicator of draw order or any way to change it.

**10. No way to delete an individual prize.**
Inside a tier card (`prizes/page.tsx:68-86`), prizes are listed but have no delete/remove button. Only the entire tier can be deleted (`removeTier` mutation). If a user adds a wrong prize name, they must delete the whole tier and re-create everything.

**11. No prize count summary anywhere.**
The prizes page shows prizes inside tier cards, but there's no "Total: X prizes" summary visible from the event detail page or anywhere else.

**12. No way to reorder tiers.**
`createTier` sets `drawOrder: tiers.length + 1`. Once created, tiers cannot be reordered. If an organizer sets up 3rd Prize first and Grand Prize last, the draw order is wrong — with no way to fix it without deleting and recreating.

---

## Session 4: Participants Import

### Test Scope
`/events/[eventId]/participants` — CSV import, manual add.

### Key Observations

**13. "Download template" link links to `/csv-template.csv`.**
`participants/page.tsx:61` — This is a static file path. If the file doesn't exist in the public directory, this silently fails with no error. No explanation of the expected CSV format is shown inline.

**14. CSV error details are suppressed.**
`participants/page.tsx:38-39` — On import, the status only shows "Imported 5, 3 errors skipped". Users have no way to know which rows failed or why. This will cause confusion when the participant count is lower than expected.

**15. Import status message disappears on next import.**
`setCsvStatus(null)` is called at the start of `handleCSV`. If a user imports a second CSV, the previous status disappears immediately — no history of how many total were imported.

---

## Session 5: Event Detail Page — Draw Launch

### Test Scope
`/events/[eventId]/page.tsx` — draw links, flow initiation.

### Key Observations

**16. Critical instruction is nearly invisible.**
`events/[eventId]/page.tsx:91` — The note "Remote controller link is shown on the Stage page" is styled `text-white/30 text-sm` — 30% white on a dark background. This is the single most important workflow instruction (the organizer needs their phone), and it's practically invisible.

**17. Draw links appear even when event is in draft (unpurchased) status.**
The "Draw Links" section (`page.tsx:66-93`) is always shown. The "This event needs a license" warning appears AFTER the draw links, below them. A user in draft status will click "Draw Stage (fullscreen)", be taken to the stage page, and encounter an invisible or broken experience. The draw links should be disabled/hidden for draft events.

**18. No setup checklist or readiness status.**
There's no "Event is ready to draw" indicator. Users don't know whether they've completed all required steps (added participants, added prizes, purchased license).

---

## Session 6: Stage Page

### Test Scope
`/app/draw/[eventId]/stage/page.tsx`

### Key Observations

**19. Stage silently auto-creates a draw session.**
`stage/page.tsx:20-26` — A `useEffect` creates a session when one doesn't exist. There's no visible feedback that this happened. No "Session created" or "Ready" state shown to the user.

**20. "All prizes awarded" is a dead-end screen.**
`stage/page.tsx:37-40` — Full black screen with text only. No button to return to dashboard, no "Export Winners" CTA, no next steps. The organizer is stuck on a black screen.

**21. QR code for remote is small and not explained.**
`stage/page.tsx:59-63` — The QR code is 88px and labeled "Remote" in `text-xs`. For an event in a loud venue on a large screen, this is hard to see. No instructions on what to do with the QR code.

**22. Stage page has no breadcrumb — no way back to dashboard from fullscreen.**
Designed for fullscreen use, which is valid, but once you're on the stage screen there's no escape hatch during an event if something goes wrong.

---

## Session 7: Remote Page

### Test Scope
`/app/draw/[eventId]/remote/page.tsx`

### Key Observations

**23. Winner name is NOT shown on the remote controller.**
`remote/page.tsx:50-59` — The remote only passes `sessionId`, `participants`, and `primaryColor` to `DrawEngine` with `isStage={false}`. In the remote view (`DrawEngine.tsx:70-110`), the prize name is shown in 40% opacity text, but the **winner's name is not displayed**. The organizer must look at the stage screen to see who won, then confirm or reject on their phone — without seeing the winner's name on the phone.

**24. Prize name displayed at 40% opacity — almost invisible.**
`DrawEngine.tsx:74` — `text-white/40 text-lg` for the current prize name. On a phone screen in a bright venue, this is unreadable.

**25. No instructions on the remote screen.**
A non-technical user opening the remote for the first time sees a large colored circle button labeled "DRAW". No explanation of what DRAW does, what Confirm/Reject does, or what the current state of the draw is.

**26. "Session not found or expired" — no recovery path.**
`remote/page.tsx:43-47` — Dead end. No link to the stage page, no instructions. The organizer is stuck.

---

## Session 8: Loading & Error States (All Pages)

### Key Observations

**27. All loading states are plain text, no spinner.**
Every page shows `<div className="text-white/40 py-24 text-center">Loading...</div>`. No skeleton loader, no spinner. Acceptable for an MVP but feels unpolished.

**28. No network error handling.**
None of the pages handle the case where Convex queries fail. If the network drops, pages stay stuck on "Loading..." indefinitely with no error message.

**29. Branding page and event page "Event not found" states have no back navigation.**
`branding/page.tsx:28-30` — Shows "Event not found" but no link to `/events`.

---

## Summary of Sessions

| Area | Issues Found | Highest Severity |
|------|-------------|-----------------|
| Navigation / Back button | 4 | CRITICAL |
| Prize setup UX | 6 | HIGH |
| Draw launch flow | 3 | CRITICAL |
| Remote UX | 4 | HIGH |
| Stage UX | 4 | HIGH |
| Loading/Error states | 3 | MEDIUM |
| Participants | 3 | MEDIUM |
| New event form | 3 | LOW |
