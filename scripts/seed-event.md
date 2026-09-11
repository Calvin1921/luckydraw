# Seeding a demo

Follow [the full setup](../docs/QUICKSTART.md), then run:

```bash
pnpm demo:seed
```

This creates a new fictional event with 100 numbered participants, three tiers and 14 prizes, and returns routes for the organizer, stage, remote and audience. Re-running creates a separate event and preserves earlier results.

All seed utilities are internal Convex mutations and require `DEV_BYPASS=true` on the selected disposable development deployment. They are callable through the deployment CLI, not the public client API.

For an existing **empty** demo event only:

```bash
pnpm exec convex run seed:seedDemoData '{"eventId":"<empty-demo-event-id>"}'
```

This refuses events containing participants, prizes, tiers, sessions or logs. It no longer deletes/recreates prizes. `seed:clearAll` remains an internal destructive maintenance utility; it is not part of the trial or video reset flow.
