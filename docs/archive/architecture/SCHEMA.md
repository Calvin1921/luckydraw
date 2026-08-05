# Lucky Draw — Convex Schema Design

> **Platform:** Convex (NoSQL document store with reactive queries)
> **Auth:** Clerk (organizations map to event organizer accounts)
> **Date:** 2026-04-07

---

## Overview

Seven tables. All use Convex's auto-generated `_id` (type `Id<"tableName">`) and `_creationTime` (Unix ms). No explicit `id` or `created_at` columns needed — Convex provides them.

---

## organizations

Mirrors Clerk org/user identity into Convex. Created on first sign-in via org sync mutation.

| Column       | Type                                              | Required | Notes                                                           |
|--------------|---------------------------------------------------|----------|-----------------------------------------------------------------|
| clerkOrgId   | v.string()                                        | YES      | Clerk org ID (`org_...`) or `user_{userId}` for personal accts  |
| name         | v.string()                                        | YES      | Display name synced from Clerk                                  |
| slug         | v.string()                                        | YES      | URL-safe identifier, unique                                     |
| plan         | v.union(v.literal("per_event"), v.literal("agency"), v.literal("enterprise")) | YES | Billing plan tier |

**Indexes:**
- `by_clerk_org_id` on `["clerkOrgId"]` — Reason: every authenticated request maps Clerk identity → Convex org doc
- `by_slug` on `["slug"]` — Reason: URL routing uses slug to resolve org

**Relationships:** none (root entity)

---

## drawEvents

One event = one lucky draw ceremony. Branding fields are inlined (no separate `branding` table) because Convex is a document store and the fields are always accessed together with the event.

| Column            | Type                                                          | Required | Notes                                           |
|-------------------|---------------------------------------------------------------|----------|-------------------------------------------------|
| orgId             | v.id("organizations")                                         | YES      | FK to organizations                             |
| name              | v.string()                                                    | YES      | English event name                              |
| nameZh            | v.optional(v.string())                                        | NO       | Traditional Chinese name (HK market)            |
| status            | v.union(v.literal("draft"), v.literal("active"), v.literal("completed"), v.literal("archived")) | YES | Event lifecycle |
| eventDate         | v.optional(v.number())                                        | NO       | Unix ms timestamp                               |
| licenseExpiresAt  | v.optional(v.number())                                        | NO       | Unix ms; set by Stripe webhook                  |
| stripeSessionId   | v.optional(v.string())                                        | NO       | Stripe Checkout session for audit               |
| primaryColor      | v.string()                                                    | YES      | Hex color for draw stage branding               |
| locale            | v.union(v.literal("en"), v.literal("zh-HK"), v.literal("both")) | YES   | Controls which name fields are displayed        |
| logoUrl           | v.optional(v.string())                                        | NO       | Cloudflare R2 URL for organizer logo            |

**Indexes:**
- `by_org` on `["orgId"]` — Reason: dashboard event list query filters by org

**Relationships:**
- `orgId → organizations._id`

---

## participants

Imported from CSV or entered manually. Up to 300 per event (enforced at mutation layer, not schema layer). The `isEligible` flag is the **elimination mechanism** — set to `false` when a winner is confirmed (and `allowRepeat = false` on the prize tier). Participants are never deleted; eligibility is toggled.

| Column       | Type                                                                    | Required | Notes                                          |
|--------------|-------------------------------------------------------------------------|----------|------------------------------------------------|
| eventId      | v.id("drawEvents")                                                      | YES      | FK to drawEvents                               |
| name         | v.string()                                                              | YES      | English name (used in draw animation)          |
| nameZh       | v.optional(v.string())                                                  | NO       | Chinese name (displayed in zh-HK locale)       |
| email        | v.optional(v.string())                                                  | NO       | For winner notification and CSV export         |
| phone        | v.optional(v.string())                                                  | NO       | Optional contact field                         |
| importSource | v.union(v.literal("manual"), v.literal("csv"), v.literal("eventrsvp")) | YES      | Tracks how this participant was added          |
| isEligible   | v.boolean()                                                             | YES      | `false` = eliminated from future draws         |

**Indexes:**
- `by_event` on `["eventId"]` — Reason: every draw query fetches all participants for an event to build the eligible pool
- Composite `by_event_eligible` on `["eventId", "isEligible"]` — Reason: draw algorithm fetches only eligible participants; avoids client-side filtering of up to 300 docs (acceptable at MVP scale but good practice)

**Relationships:**
- `eventId → drawEvents._id`

**Elimination design note:** `isEligible` is set to `false` in the same mutation that marks a winner as confirmed. If the organizer rejects a draw result, `isEligible` is NOT changed — the participant re-enters the pool. This is a simple boolean flip, not a separate join table, which is appropriate for the 300-participant MVP scale.

---

## prizeTiers

Prize categories (e.g., "3rd Prize × 5", "2nd Prize × 3", "Grand Prize × 1"). Draw order is explicit — lower `drawOrder` = drawn first (typically lower-value prizes drawn before grand prize).

| Column    | Type                   | Required | Notes                                              |
|-----------|------------------------|----------|----------------------------------------------------|
| eventId   | v.id("drawEvents")     | YES      | FK to drawEvents                                   |
| name      | v.string()             | YES      | English tier name (e.g., "3rd Prize")              |
| nameZh    | v.optional(v.string()) | NO       | Chinese tier name                                  |
| drawOrder | v.number()             | YES      | Ascending — lower value drawn first                |
| allowRepeat | v.boolean()          | YES      | `true` = winner stays eligible for future tiers    |

**Indexes:**
- `by_event` on `["eventId"]` — Reason: prizes setup page fetches all tiers for an event

**Relationships:**
- `eventId → drawEvents._id`

---

## prizes

Individual prize instances within a tier (e.g., 5 separate "3rd Prize" rows). Denormalizing `eventId` here avoids a join through `prizeTiers` when querying "all unawarded prizes for this event."

| Column      | Type                   | Required | Notes                                           |
|-------------|------------------------|----------|-------------------------------------------------|
| tierId      | v.id("prizeTiers")     | YES      | FK to prizeTiers                                |
| eventId     | v.id("drawEvents")     | YES      | Denormalized FK — enables `by_event` index      |
| name        | v.string()             | YES      | English prize name (e.g., "iPhone 16")         |
| nameZh      | v.optional(v.string()) | NO       | Chinese prize name                              |
| description | v.optional(v.string()) | NO       | Optional detail text shown on stage             |
| isAwarded   | v.boolean()            | YES      | `true` = this specific prize instance was given |

**Indexes:**
- `by_tier` on `["tierId"]` — Reason: prizes-per-tier display and counting
- `by_event` on `["eventId"]` — Reason: "get next unawarded prize for event" query used during draw session setup

**Denormalization justification:** `eventId` on `prizes` is redundant (reachable via `tierId → prizeTiers.eventId`) but required for the `by_event` index. In Convex you cannot index through a join. The field is set once at insert time and never changes, so drift is not a concern.

**Relationships:**
- `tierId → prizeTiers._id`
- `eventId → drawEvents._id`

---

## drawSessions

One session = one "spin" attempt for one prize. A session is created when the organizer initiates a draw for a specific prize tier. Multiple sessions per tier are possible (if results are rejected and redrawn).

| Column           | Type                              | Required | Notes                                                        |
|------------------|-----------------------------------|----------|--------------------------------------------------------------|
| eventId          | v.id("drawEvents")                | YES      | FK — fast lookup of active session for an event              |
| tierId           | v.id("prizeTiers")                | YES      | Which prize tier this session is drawing for                 |
| status           | v.union(v.literal("idle"), v.literal("spinning"), v.literal("result"), v.literal("confirmed"), v.literal("rejected"), v.literal("closed")) | YES | State machine position |
| remoteToken      | v.string()                        | YES      | UUID v4 — used in remote controller URL (`/draw/[token]/remote`) |
| algorithm        | v.string()                        | YES      | Algorithm identifier, e.g. `"fisher-yates-webcrypto-v1"`    |
| prngSeed         | v.optional(v.string())            | NO       | 8-char hex seed; set when winner is selected for audit trail |
| currentWinnerId  | v.optional(v.id("participants"))  | NO       | Set in `result` state; cleared on rejection                  |
| currentPrizeId   | v.optional(v.id("prizes"))        | NO       | Which prize instance is being awarded                        |
| currentResultId  | v.optional(v.id("winnerLogs"))    | NO       | Points to the `drawn` log entry for this spin result         |

**Indexes:**
- `by_event` on `["eventId"]` — Reason: stage, remote, and audience screens all query "active session for event"
- `by_remote_token` on `["remoteToken"]` — Reason: remote controller page looks up session by token (no auth required for remote URL)

**Relationships:**
- `eventId → drawEvents._id`
- `tierId → prizeTiers._id`
- `currentWinnerId → participants._id`
- `currentPrizeId → prizes._id`
- `currentResultId → winnerLogs._id`

---

## winnerLogs

Immutable audit log. Every state transition that involves a winner decision appends a row. Never updated — only inserted. This enables full audit trail: drawn → confirmed/rejected → replaced chains are fully traceable.

| Column          | Type                                                                               | Required | Notes                                                       |
|-----------------|------------------------------------------------------------------------------------|----------|-------------------------------------------------------------|
| eventId         | v.id("drawEvents")                                                                 | YES      | FK — enables bulk export query                             |
| sessionId       | v.id("drawSessions")                                                               | YES      | Which draw session generated this entry                     |
| participantId   | v.id("participants")                                                               | YES      | FK — kept for relational queries                            |
| prizeId         | v.id("prizes")                                                                     | YES      | FK — kept for relational queries                            |
| participantName | v.string()                                                                         | YES      | Denormalized — log is self-contained even if records change |
| participantNameZh | v.optional(v.string())                                                           | NO       | Denormalized Chinese name for zh-HK CSV export              |
| participantEmail | v.optional(v.string())                                                            | NO       | Denormalized — needed for CSV export without join           |
| prizeName       | v.string()                                                                         | YES      | Denormalized — log is self-contained                        |
| prizeNameZh     | v.optional(v.string())                                                             | NO       | Denormalized Chinese name for zh-HK CSV export              |
| tierName        | v.string()                                                                         | YES      | Denormalized — needed in CSV export ("Grand Prize")         |
| action          | v.union(v.literal("drawn"), v.literal("confirmed"), v.literal("rejected"), v.literal("replaced")) | YES | What happened |
| actorUserId     | v.optional(v.string())                                                             | NO       | Clerk user ID of organizer who confirmed/rejected            |

**Indexes:**
- `by_event` on `["eventId"]` — Reason: CSV export and winner list page query all confirmed entries for an event
- `by_event_action` on `["eventId", "action"]` — Reason: winner list page filters to `action = "confirmed"` entries only

**Denormalization justification:** `participantName`, `participantNameZh`, `participantEmail`, `prizeName`, `prizeNameZh`, `tierName` are duplicated from source tables. The winner log must survive participant/prize record deletion or name correction without losing historical accuracy. CSV export reads only `winnerLogs` — no joins needed for the export path.

**Relationships:**
- `eventId → drawEvents._id`
- `sessionId → drawSessions._id`
- `participantId → participants._id`
- `prizeId → prizes._id`

---

## drawSessions State Machine

```
                    ┌─────────────────────────────────┐
                    │                                 │
              createSession()                   triggerDraw()
                    │                                 │
                    ▼                                 │
             ┌────────────┐                           │
             │    idle    │◄──────────────────────────┘
             └─────┬──────┘         (new session on reject-and-retry)
                   │
            triggerDraw()
                   │
                   ▼
          ┌──────────────────┐
          │    spinning      │  ← GSAP animation running on stage
          └────────┬─────────┘  ← all 3 screens subscribed via useQuery
                   │
            revealWinner()      ← mutation sets currentWinnerId, status="result"
                   │             prngSeed logged here
                   ▼
          ┌──────────────────┐
          │     result       │  ← winner name displayed, awaiting organizer action
          └──────┬───────────┘
                 │
         ┌───────┴──────────┐
         │                  │
   confirmWinner()     rejectWinner()
         │                  │
         ▼                  ▼
  ┌──────────────┐   ┌──────────────┐
  │  confirmed   │   │   rejected   │
  └──────┬───────┘   └──────┬───────┘
         │                  │
    closeSession()     (create new session
         │                for same tier OR
         ▼               set status back
  ┌──────────────┐       to idle)
  │    closed    │
  └──────────────┘
```

### State Transition Rules

| From        | To          | Mutation            | Side Effects                                                      |
|-------------|-------------|---------------------|-------------------------------------------------------------------|
| idle        | spinning    | `triggerDraw`       | selects eligible pool, starts animation signal                    |
| spinning    | result      | `revealWinner`      | sets `currentWinnerId`, `currentPrizeId`, `prngSeed`; inserts `drawn` log |
| result      | confirmed   | `confirmWinner`     | sets `prizes.isAwarded=true`; sets `participants.isEligible=false` (if `!allowRepeat`); inserts `confirmed` log |
| result      | rejected    | `rejectWinner`      | clears `currentWinnerId`; inserts `rejected` log; creates new session in `idle` |
| confirmed   | closed      | `closeSession`      | terminal state                                                    |

**No direct `spinning → idle` transition** — a draw must always resolve to `result` before the organizer can act.

---

## Eliminated Participants Tracking

Elimination is tracked via `participants.isEligible = false`. This approach was chosen over a separate `eliminatedParticipants` join table because:

1. The eligible pool is always queried as `participants.filter(p => p.isEligible)` — a single boolean field is more efficient than a join at 300-participant scale.
2. Re-eligibility (if organizer undoes a confirmation) is a single field update.
3. Convex's `by_event_eligible` compound index makes this query efficient.

**Flow on `confirmWinner` (when `prizeTier.allowRepeat = false`):**
```
mutation confirmWinner:
  1. patch(participants, { isEligible: false })
  2. patch(prizes, { isAwarded: true })
  3. patch(drawSessions, { status: "confirmed" })
  4. insert(winnerLogs, { action: "confirmed", ... })
```

**Flow on `rejectWinner`:**
```
mutation rejectWinner:
  1. patch(drawSessions, { status: "rejected", currentWinnerId: undefined })
  2. insert(winnerLogs, { action: "rejected", ... })
  3. insert(drawSessions, { status: "idle", ... })  ← new session for retry
```

---

## CSV Export Fields

The winner CSV export reads only from `winnerLogs` where `action = "confirmed"`. Required columns:

| CSV Column        | Source Field              |
|-------------------|---------------------------|
| Tier              | `tierName`                |
| Prize             | `prizeName` / `prizeNameZh` |
| Participant Name  | `participantName` / `participantNameZh` |
| Email             | `participantEmail`        |
| Draw Time         | `_creationTime` (auto)    |
| Confirmed By      | `actorUserId`             |
| Algorithm         | via `sessionId → drawSessions.algorithm` |
| Seed              | via `sessionId → drawSessions.prngSeed`  |

All denormalized fields (name, email, prize name, tier name) are stored directly in `winnerLogs` so the CSV export mutation requires zero joins.
