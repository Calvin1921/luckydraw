# Lucky Draw

### One host. Three screens. A smoother prize draw.

At a live event, drawing a name is only one part of the job. Someone has to prepare the guest list, tell the host what comes next, keep the projector in sync, and handle a prize that goes unclaimed.

**Lucky Draw brings that workflow together:** prepare the event once, run the draw from a phone, and let the stage and audience displays follow the same result.

![The actual Lucky Draw stage revealing the fictional participant Demo Guest 079.](docs/media/demo-stage.png)

*Actual app capture using fictional data. Current status: working prototype for local demos; [production boundaries](#current-boundaries) remain.*

[See the workflow](#from-preparation-to-prize) · [Try a fictional event](#try-it) · [Explore the engineering](docs/ENGINEERING.md) · [Contribute](CONTRIBUTING.md)

## From preparation to prize

![Workflow illustration: the organizer prepares guests and prizes; a phone remote controls the draw; the stage and audience displays follow the shared result.](docs/media/three-screen-workflow.svg)

1. **Prepare.** Add participants and arrange prizes into rounds in the organizer dashboard.
2. **Present.** Open the stage on a projector and the audience view on another display. The host selects a round on the phone remote.
3. **Draw.** Tap **DRAW**. The server selects a guest, and the connected displays receive that result.
4. **Resolve.** Confirm to award the prize, or reject an unclaimed result and draw again. Each action is recorded in the backend.

Confirmation uses a second tap and reduces the remaining-prize count. Rejection keeps the prize available. **A rejected guest remains eligible**—the current flow does not automatically mark them absent.

## Meet the three live screens

| Host’s phone | Projector | Audience display |
|---|---|---|
| Select a round, draw, confirm or reject. | Make the selected guest visible to the room. | Follow the shared result on another screen. |
| <img src="docs/media/demo-remote.png" alt="Remote showing fictional guest Demo Guest 079 with Reject and Confirm buttons." width="240"> | <img src="docs/media/demo-stage.png" alt="Projector stage revealing fictional guest Demo Guest 079." width="500"> | <img src="docs/media/demo-audience.png" alt="Audience view showing fictional guest Demo Guest 079." width="240"> |

*Three views of the same fictional result, captured separately in desktop browser windows on a local development instance. The remote also supports phone-sized use.*

The organizer dashboard sits outside those three live screens: it is where the event is prepared and winner export becomes available after a confirmation.

<details>
<summary><strong>See the organizer dashboard</strong></summary>

![Organizer overview showing 100 fictional participants, three prize rounds, and links to the stage, remote and audience views.](docs/media/demo-organizer.png)

</details>

## Why these choices matter

| During an event… | Lucky Draw’s approach |
|---|---|
| The host should focus on the room. | A focused phone remote carries the live controls. |
| Multiple displays must agree on the result. | Stage and audience use shared reactive session state. |
| Selecting someone is not the same as awarding a prize. | A human confirms the result before the prize is marked awarded. |
| A prize may go unclaimed. | Reject returns the prize to the available pool for another draw. |
| The organizer needs a record afterward. | Drawn, confirmed and rejected actions create log entries; confirmed winners have an authenticated CSV export path. |
| Names and motion preferences differ. | Bilingual labels and a static reduced-motion path are built into the presentation. |

This is a product-engineering project, with no LLM dependency. The work is in coordinating people, screens and state. No measured time savings, event-scale benchmark or accessibility certification is claimed.

## Try it

The shortest trial is **three browser windows on one laptop**. No projector, physical phone or payment setup is required.

**You need:** Node.js 22, pnpm 10.22.0, a disposable Convex development deployment, and Clerk development keys. Initial service setup is required; this is not an account-free hosted demo.

```bash
git clone https://github.com/Calvin1921/luckydraw.git
cd luckydraw
pnpm install --frozen-lockfile
cp .env.example .env.local
```

Follow the [one-time setup guide](docs/QUICKSTART.md#configure-the-development-services), then:

```bash
pnpm dev
# In a second terminal, once Convex is ready:
pnpm demo:seed
```

The seed creates a **new event with 100 fictional guests, 3 rounds and 14 prizes**, then returns the organizer, stage, remote and audience paths. Open them at `http://localhost:3000`. Re-running the seed creates another event and preserves earlier draws.

**First draw:** open the remote directly from the organizer dashboard, choose the first round, open the stage and audience views, then tap DRAW. Confirm with the second tap and check that the remaining count decreases. The current initial stage does not show its pairing QR code until a round has started.

[Full setup and troubleshooting](docs/QUICKSTART.md) · [Screenshot walkthrough](docs/DEMO_WALKTHROUGH.md)

## Under the hood

Next.js 15 · React 19 · TypeScript · Convex · Clerk · Tailwind CSS · Vitest

Convex mutations change the draw session; reactive queries update the views. The server chooses the guest, the host resolves the result, and the database records the action. Animations run locally, so shared results do not imply frame-locked displays.

Nova uses GSAP, Framer Motion and canvas for the reveal. Motion supports the moment; it is secondary to operating the event.

[Engineering evidence](docs/ENGINEERING.md) covers the implementation, accessibility hooks, loading/error states, selection algorithm and current tradeoffs. [The roadmap](docs/ROADMAP.md) turns the remaining gaps into concrete next steps.

## Current boundaries

Use **fictional data on an isolated development deployment**. This public source release is a working prototype, not a production-readiness claim.

- **Remote access:** public session queries can expose control tokens. Event IDs are not organizer authorization; stronger pairing and permissions are needed before real events.
- **Host feedback:** the next-prize label is generic, and the connection badge does not reliably reflect a lost connection.
- **Results:** confirmed records can be exported with authentication; there is no on-page winner list or full audit-history UI. Logs are not a tamper-evident ledger.
- **Trial gaps:** the in-app CSV-template link is currently broken. Use the fictional seed for the trial. Export and payment are outside the bypass-mode walkthrough.
- **Selection:** the live mutation differs from the Fisher–Yates helper and its recorded algorithm label. Fairness and replay guarantees require further work.
- **Development mode:** bypass flags disable access checks and have no automatic production guard.

See [security notes](SECURITY.md) and [the detailed boundaries](docs/ENGINEERING.md#security-and-production-boundaries).

## Develop and contribute

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

CI is configured for pull requests and pushes to `main`. The latest local checks passed type checking and 19 tests; lint completed with warnings. A production-build attempt was blocked by Google Fonts download timeouts. These checks do not replace a live-device rehearsal.

Bug reports, small fixes and documentation improvements are welcome. Start with [contribution guidance](CONTRIBUTING.md), the [roadmap](docs/ROADMAP.md), and the [documentation map](docs/README.md).

Released under the [MIT License](LICENSE).
