# Lucky Draw — 80-second demo script

**Deliverable:** recording script and shot list; no finished video is included. Target 80 seconds, with brief pauses for results. Show the real app; do not substitute animation prototypes for working features.

## Prepare the take

Use [the demo setup](QUICKSTART.md) and a fresh `pnpm demo:seed` event. Data must be **Demo Night — Fictional Event**, **Demo Guest 001–100**, and the fictional seed prizes. Never import an attendee spreadsheet. Keep browser chrome, account menus, terminal output, deployment IDs, QR codes, tokens and notifications out of frame. Use captions and a visible “Fictional demo data” label throughout.

Record at 1920 × 1080. For the live sequence, show a wide stage pane, a narrow remote pane and a smaller audience pane. Label each pane; ensure text is readable. Record the synchronization in one continuous take. Cuts between setup and results are fine, but do not edit separate draws together as proof of sync. The winner is random: never script a specific guest number.

| Time | Shot / action | Voiceover | Caption |
|---|---|---|---|
| 0–9s | Organizer overview with the fictional event, participants and prize totals. | “At a live event, the organizer needs to manage participants, keep the host and projector aligned, and remember who received each prize.” | One event. One shared result. |
| 9–18s | Briefly open participants, then prizes. Show numbered bilingual demo labels. | “Lucky Draw puts preparation in one dashboard. Here I’ve loaded fictional guests and arranged the prizes into three tiers.” | Prepare once |
| 18–29s | Switch to the labeled three-pane view. Select the first tier on the remote. | “During the event, the host uses the phone remote. The stage is for the projector, and the audience view follows the same draw.” | Remote → Stage + Audience |
| 29–42s | Tap DRAW once. Let the reveal complete; hold both display results legibly. | “One tap selects a guest on the server. Both displays receive that result, so the host can keep attention on the room.” | Same selected guest across screens |
| 42–52s | Tap Confirm, then the confirmation button. Cut to the confirmed-winners section. | “The host confirms the winner with a second tap. The prize is awarded, and the organizer can review the confirmed result afterward.” | Confirm → Award → Record |
| 52–64s | Return to live panes; draw, wait for result, Reject and confirm rejection. Show the prize remains available; start another draw if time permits. | “If a result cannot be claimed, the host rejects it. The prize stays available for another draw, and the rejection is recorded too.” | Reject → Prize still available |
| 64–72s | A separately labeled reduced-motion take; show a static Nova result. | “The reveal also has a reduced-motion path. Loading, waiting and error states support the surrounding workflow.” | Reduced motion: static reveal |
| 72–80s | End on organizer confirmed results and a short boundary caption. | “This is a product demo: coordinated screens and traceable outcomes. Stronger remote authorization is still needed before using it for real events.” | Demo boundary: remote authorization needs hardening |

## Recording notes

- Do not imply that the dashboard displays the full audit history: it lists **confirmed** results. Drawn/rejected entries exist in backend logs. Keep backend account screens out of the final cut.
- Rejection does not remove the guest from the eligible pool. If the same guest appears again, that is current behavior, not a recording error.
- If the reveal takes longer, trim transitions or the participants/prizes tour. Preserve the continuous sync shot and finish within 90 seconds.
- The reduced-motion take must use the OS/browser preference, not a freeze-frame presented as app behavior.
- Avoid claims of measured latency, certified accessibility, tamper-proof fairness or production readiness. No AI feature is present in this draw flow.
- Before sharing, review every frame and captions for identifying data or account details. Use only fresh synthetic-data captures; existing repository media has not been cleared for this recording.
