# Lucky Draw portfolio audit

Scope: Lucky Draw only. This refresh targets a reviewer who wants to understand the organizer’s problem and product outcome within a minute.

## Findings and changes

| Before | Change |
|---|---|
| Hero media emphasized motion and an unintegrated prototype. | Lead with the event coordination problem, an accessible three-screen workflow illustration and a three-step product explanation. |
| Organizer dashboard imagery stood beside two live screens, obscuring the third live screen. | Name stage, remote and audience explicitly; explain the organizer dashboard as preparation and review. |
| Realtime architecture and motion dominated the narrative. | Keep product value first; move detailed evidence and qualifications into a focused engineering guide. |
| Seed command omitted required arguments; the documented no-Clerk path still mounted Clerk providers. | State actual service requirements, separate initial configuration from the trial, and add `pnpm demo:seed` returning all routes. |
| Seed used realistic names, a mismatched demo organization and destructive prize replacement. | Generate numbered fictional guests without contact fields; use the dashboard’s demo organization; create fresh events and reject reseeding populated events. |
| Seed utilities were public mutations with “dev-only” comments. | Convert them to internal mutations and require explicit server demo mode. No deployment was changed. |
| README described Fisher–Yates as the live draw algorithm and implied token checks protected the remote. | Document the actual modulo selection and token exposure through public queries. These production gaps are not presented as solved. |
| No concise product demo narration. | Add an 80-second shot list using the fake seed, a continuous sync shot, confirmation/rejection and a clear production boundary. |
| The lint command used `next lint`, absent in the installed Next.js CLI. | Use ESLint directly so the existing configuration can run. |

## Validation performed

- TypeScript check: passed.
- Tests: 19 passed across four files, including three new integration checks for demo environment gating, fictional/contact-free data, and preservation of existing events.
- Lint: passed with nine warnings in generated files and existing default exports; no lint errors.
- Production build: attempted with the repository’s CI placeholder service configuration. Blocked by Google Fonts fetch failures, including timeouts with network access enabled. No successful production build is claimed.
- Workflow SVG: rendered and visually inspected. It is explicitly an illustration, not a live screenshot.
- New documentation: checked relative links, seed command names, route names and key behavior against source. New source and documentation checked for local paths and identifying/contact data.

## Limits and remaining work

No Clerk application or Convex deployment was provisioned or modified. The seed was exercised with `convex-test`; service provisioning, the documented CLI sequence and live three-window synchronization still need a configured development rehearsal. No video was recorded; the requested script and shot list are complete.

Existing GIFs, screenshots and historical design/review documents remain in the repo, but are no longer the README’s primary story or demo evidence. Their embedded content and git history were not comprehensively privacy-cleared. Do not reuse those images for the new recording without review. The new workflow asset and seed use explicitly fictional labels only.

A real-event release still needs remote authorization, consistent live selection metadata/algorithm, authenticated actor attribution, operational/reconnect testing and a fresh accessibility review. See [engineering boundaries](ENGINEERING.md). This documentation refresh is not a production sign-off or a claim of AI functionality.
