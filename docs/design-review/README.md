# Design review — Galaxy draw scene

Stills captured during the review loop for the Galaxy draw preset (WebGL particle
scene rendered in the Draw Preset live preview). The loop: build, capture the scene
at fixed choreography points, review the stills at full size, adjust, re-capture.
Stills make composition and legibility drift easy to diff — regressions that are
easy to miss in motion are obvious side by side.

## Iteration trail

| File | Pass | State |
|---|---|---|
| `01-galaxy-idle-v1.jpg` | v1 | Idle star pool |
| `02-galaxy-idle-v2.jpg` | v2 | Idle star pool |
| `03-galaxy-idle-v3.jpg` | v3 | Idle star pool |
| `04-winner-reveal-early.jpg` | early | Winner reveal |
| `05-winner-reveal-final.jpg` | final | Winner reveal |

**v1 → v2 (idle):** v1 scattered participant names across the whole viewport with a
wide depth range — foreground labels dominated the frame and collided with each
other, and the galaxy core sat small and off-centre. v2 constrained labels to the
galaxy disc and tightened the label scale range, so names read as part of the star
field instead of floating over it.

**v2 → v3 (idle):** v3 rebuilt the idle composition around a dense, luminous core —
the "star pool" the draw pulls from — with names orbiting inside the field and a
warm gold palette matching the event-brand accent.

**Reveal (early → final):** the winner name renders bilingually (Traditional Chinese
primary, Latin secondary) in gold over the core. The final pass adds a soft glow
backdrop behind the name block so it stays legible against a bright, busy star
field from projector distance.

Capture context: local dev build, Chromium 1920×1080, seeded demo event with
fictional participant names.

The multi-preset exploration these stills come from was later consolidated into a
single cinematic scene (`components/draw/NovaDraw.tsx`). The captures document the
capture-review-iterate method used while the draw visuals were being developed.
