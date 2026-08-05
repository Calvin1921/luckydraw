# Seeding Demo Data

Run from the Convex dashboard or CLI:

```
npx convex run seed:seedDemoData '{"eventId":"<your-event-id>"}'
```

Get the eventId from the URL when viewing an event in the dashboard.

## What gets seeded

- **100 participants**: 60 HK Chinese (name + nameZh) + 40 English-only, all `isEligible: true`
- **3 prize tiers**:
  - Consolation Prize (安慰獎) — 10 × Gift Voucher HK$200
  - Second Prize (二等獎) — 3 × Wireless Earbuds
  - Grand Prize (大獎) — 1 × iPhone 16 Pro

## Idempotency

- Participants are only inserted if the event currently has 50 or fewer participants.
- Prize tiers and prizes are always deleted and recreated fresh on every run.
