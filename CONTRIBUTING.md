# Contributing to Lucky Draw

Start with [the product workflow](README.md#from-preparation-to-prize) and [the setup guide](docs/QUICKSTART.md). Use a disposable development deployment and fictional participants throughout development and testing.

## Pick a useful change

[The roadmap](docs/ROADMAP.md) lists current gaps and acceptance criteria. Prefer one focused improvement per pull request. For a larger change, describe the user problem and proposed behavior in an issue first.

## Report a bug

Include:

- Which screen you used: organizer, remote, stage or audience.
- The action you took and what you expected.
- What happened, whether it repeats, and the browser/device type.
- Minimal steps using fictional data. An annotated screenshot or short recording helps.

Do not attach real attendee lists, contact details, credentials, remote-control tokens, environment files or private event information. Follow [security guidance](SECURITY.md) for vulnerabilities.

## Submit a change

1. Work on a separate branch.
2. Describe the user-visible before/after behavior.
3. Add meaningful tests when changing selection, permissions, mutations or state transitions.
4. Run `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm build`; report failures or environmental limits accurately.
5. For interface changes, check a phone-sized remote and a desktop display. Check loading, empty and error states, keyboard focus, long/bilingual labels and reduced motion where relevant.
6. Keep documentation and demo instructions consistent with the implementation.

The draw's server-side behavior, the displayed result and the log must agree. Do not fix a presentation issue by making a screen choose a different winner locally.

## Share demo assets

Follow the [screenshot walkthrough](docs/DEMO_WALKTHROUGH.md). Capture actual app behavior using entirely fictional data. Label separate captures accurately and distinguish proposed behavior from implemented behavior. A video is optional.

Keep pull requests small enough to review. Explain tradeoffs and validation, including anything you could not test.
