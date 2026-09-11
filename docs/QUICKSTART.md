# Try a fictional event

The shortest live trial uses three windows on one laptop. No phone, projector, payment setup or real participant list is required. This is an online app: Convex and Clerk development setup are still required. The [workflow illustration](media/three-screen-workflow.svg) and [video shot list](DEMO_VIDEO.md) need no setup.

## Install

Use Node.js 22 and pnpm 10.22.0 (the version pinned in `package.json`).

```bash
git clone https://github.com/Calvin1921/luckydraw.git
cd luckydraw
pnpm install --frozen-lockfile
cp .env.example .env.local
```

## Configure the development services

1. Create a **Clerk development application**. Put its publishable and secret keys into the matching fields in `.env.local`. Placeholder keys will not authenticate a working app. The development bypass skips sign-in but does not remove the Clerk providers.
2. In that application, configure a JWT template named `convex` with audience `convex`. Copy its issuer domain. The backend uses this value in `convex/auth.config.ts`.
3. Run `pnpm exec convex dev`. Choose a **new, disposable development deployment** for this demo. It writes the Convex deployment and public URL configuration to `.env.local`. If initialization asks for `CLERK_JWT_ISSUER_DOMAIN`, set it in that deployment’s environment settings, using the issuer from step 2, then let initialization finish. Keep keys and deployment settings out of recordings and commits.
4. Once this deployment is selected, enable its server-side demo mode:

   ```bash
   pnpm exec convex env set DEV_BYPASS true
   ```

5. In `.env.local`, set `NEXT_PUBLIC_DEV_BYPASS_AUTH=true`. Setting `DEV_BYPASS` in this local file alone does **not** configure the Convex server. Both switches are for disposable, fake-data demos only; neither has an automatic production guard.
6. Stop the initial `convex dev` process after it reports ready. Start the application and backend together:

   ```bash
   pnpm dev
   ```

Do not start a second Convex watcher alongside `pnpm dev`. Stripe variables can stay unset for this trial.

## Create the demo

In a second terminal, from the repo, after Convex reports ready:

```bash
pnpm demo:seed
```

It creates **Demo Night — Fictional Event**, 100 numbered guests (60 with Traditional Chinese demo labels), three tiers and 14 fictional prizes. No contact information is generated. It returns `organizer`, `stage`, `remote` and `audience` paths. Add each path to `http://localhost:3000`.

The organizer is a preparation/review dashboard; the **three live screens** are stage, remote and audience. Open the stage and audience side by side, with the remote in a narrow window. The seeded event belongs to the same demo workspace that `/events` uses.

## Complete one draw

1. Open the returned organizer path. Check **100 participants** and **3 tiers**.
2. Open the remote path and select the first available prize tier. Open stage and audience using the same event ID. They may show waiting states until the tier starts.
3. Tap **DRAW** on the remote. Watch the same selected guest appear on stage and audience; animations run locally and are not frame-locked.
4. Tap **Confirm**, then its confirmation button. Return to the organizer overview: the confirmed result should be listed and one prize should be awarded.
5. Draw again. Tap **Reject**, then its confirmation button. The prize stays available; tap **DRAW** again to retry. The rejected guest is not automatically disqualified and can be selected again.
6. Enable your operating system’s reduced-motion preference and repeat a reveal. The Nova scene should use its static path.

**Fresh take:** run `pnpm demo:seed` again and use the new paths. It creates a separate event. Do not use `seed:clearAll` as a recording reset; it deletes draw data across the selected deployment.

## If something does not work

| Symptom | Check |
|---|---|
| Clerk reports a missing or invalid key | Replace placeholders with development keys and restart `pnpm dev`. Bypass does not remove Clerk. |
| Convex configuration fails | Set the Clerk issuer on the selected Convex deployment; check `.env.local` points to that deployment. |
| Seed says demo utilities are disabled | `DEV_BYPASS=true` must be set with Convex environment configuration, not just in `.env.local`. |
| Dashboard asks for sign-in or reports ownership errors | Check both demo switches and restart the Next.js process after local environment changes. |
| Stage says it is waiting | Select a tier from the remote; check all windows use the new event ID. |
| Draw is rejected as too soon | Wait at least three seconds between draws. |
| Export fails in bypass mode | Winner CSV export requires a real authenticated token. Review confirmed winners in the dashboard for this demo. |

For a physical phone, `localhost` refers to the phone itself. Use a reachable development host and ensure Clerk permits that origin; do not expose this bypass-enabled demo publicly. The one-laptop trial avoids that configuration.

After the trial, stop the local processes and disable both bypass switches before reusing the deployment. Do not import real data: [remote authorization and other production gaps remain](ENGINEERING.md#security-and-production-boundaries).
