# Lucky Draw — Convex Indexing Strategy

> **Platform:** Convex
> All indexes are B-tree by default (Convex's only index type). Convex does not support hash indexes, partial indexes, or composite indexes with range filters beyond what the query pattern specifies. Index selection is based on Convex's index rules: fields must match query `.withIndex("name", q => q.eq(...))` calls exactly.

---

## Index Inventory

### organizations

| Index Name        | Fields          | Query Pattern                                    |
|-------------------|-----------------|--------------------------------------------------|
| `by_clerk_org_id` | `[clerkOrgId]`  | `ctx.db.query("organizations").withIndex("by_clerk_org_id", q => q.eq("clerkOrgId", identity.tokenIdentifier))` — runs on every authenticated mutation/query to resolve Convex org from Clerk identity |
| `by_slug`         | `[slug]`        | URL slug resolution — `q.eq("slug", params.slug)` |

**Rationale:** `by_clerk_org_id` is the hottest read in the system — every server function that needs org context uses it. Without the index, Convex would perform a full table scan on `organizations`. `by_slug` supports URL routing.

---

### drawEvents

| Index Name | Fields    | Query Pattern                                    |
|------------|-----------|--------------------------------------------------|
| `by_org`   | `[orgId]` | `ctx.db.query("drawEvents").withIndex("by_org", q => q.eq("orgId", org._id))` — event list dashboard |

**Rationale:** All dashboard queries scope to the current org. Without this index, fetching 10 events for an org would scan all events across all orgs.

---

### participants

| Index Name          | Fields                      | Query Pattern                                                    |
|---------------------|-----------------------------|------------------------------------------------------------------|
| `by_event`          | `[eventId]`                 | `ctx.db.query("participants").withIndex("by_event", q => q.eq("eventId", eventId))` — full participant list for display and CSV |
| `by_event_eligible` | `[eventId, isEligible]`     | `ctx.db.query("participants").withIndex("by_event_eligible", q => q.eq("eventId", eventId).eq("isEligible", true))` — eligible pool for draw algorithm |

**Rationale for `by_event_eligible`:** The draw algorithm only needs eligible participants. At 300 participants the table scan would be negligible, but the compound index is the correct pattern — it avoids loading ineligible docs and is required as the pool shrinks during a multi-tier event (e.g., after 9 prizes awarded, 291 eligible remain). Using `.filter()` client-side after `.withIndex("by_event")` is functional but loads all 300 docs; the compound index avoids this.

---

### prizeTiers

| Index Name | Fields      | Query Pattern                                                   |
|------------|-------------|------------------------------------------------------------------|
| `by_event` | `[eventId]` | `ctx.db.query("prizeTiers").withIndex("by_event", q => q.eq("eventId", eventId))` — prizes setup page; draw session initialization |

**Rationale:** Prize tiers are always accessed in the context of an event.

---

### prizes

| Index Name | Fields      | Query Pattern                                                          |
|------------|-------------|------------------------------------------------------------------------|
| `by_tier`  | `[tierId]`  | `ctx.db.query("prizes").withIndex("by_tier", q => q.eq("tierId", tierId))` — prizes-per-tier display and count |
| `by_event` | `[eventId]` | `ctx.db.query("prizes").withIndex("by_event", q => q.eq("eventId", eventId))` — finding next unawarded prize when opening a draw session |

**Rationale for `by_event` on prizes:** When initializing a draw session, the mutation must find the next unawarded prize for the selected tier. The query pattern is: `get prizes for event, filter to tier, filter to !isAwarded`. Without `by_event`, this requires knowing the tierId in advance and using `by_tier`. Both indexes are needed: `by_tier` for management UI (show prizes per tier), `by_event` for the draw session setup path that might need to scan across tiers.

**Note on `isAwarded` filter:** Convex compound indexes support equality on the second field. Adding `isAwarded` to the index (i.e., `["eventId", "isAwarded"]`) is a reasonable optimization but at max 300 prizes per event it's not critical for MVP. Kept simple for now; can be added post-MVP if needed.

---

### drawSessions

| Index Name         | Fields           | Query Pattern                                                               |
|--------------------|------------------|-----------------------------------------------------------------------------|
| `by_event`         | `[eventId]`      | `ctx.db.query("drawSessions").withIndex("by_event", q => q.eq("eventId", eventId))` — stage, remote, audience screens subscribe to active session |
| `by_remote_token`  | `[remoteToken]`  | `ctx.db.query("drawSessions").withIndex("by_remote_token", q => q.eq("remoteToken", token))` — remote controller page resolves session by URL token |

**Rationale for `by_remote_token`:** The remote controller URL is `/draw/[token]/remote` — it does not carry an event ID. The token is a UUID4, making collision impossible. This index is critical for the unauthenticated lookup path (remote pages are public routes per `middleware.ts`).

**Active session lookup note:** The query `by_event` returns all sessions for an event. The mutation layer ensures only one session is `idle` or `spinning` or `result` at a time (enforced in code, not schema). The query should `.filter(q => q.neq("status", "closed"))` or `.order("desc")` and take the first result. This is fine at MVP scale (sessions per event = ~10 prizes × possible retries).

---

### winnerLogs

| Index Name        | Fields                  | Query Pattern                                                             |
|-------------------|-------------------------|---------------------------------------------------------------------------|
| `by_event`        | `[eventId]`             | `ctx.db.query("winnerLogs").withIndex("by_event", q => q.eq("eventId", eventId))` — full audit log for event |
| `by_event_action` | `[eventId, action]`     | `ctx.db.query("winnerLogs").withIndex("by_event_action", q => q.eq("eventId", eventId).eq("action", "confirmed"))` — winner list page and CSV export |

**Rationale for `by_event_action`:** CSV export and the winner list page only need `action = "confirmed"` entries. Without this compound index, the query loads all log entries for the event (drawn + confirmed + rejected + replaced) and filters client-side. For a 300-participant event with multiple retries, this could be 600+ log entries. The compound index returns only confirmed entries directly.

---

## What We Chose NOT to Index

| Candidate                          | Reason Not Indexed                                                               |
|------------------------------------|----------------------------------------------------------------------------------|
| `drawEvents.status`                | Dashboard shows all events regardless of status; filtering is in-memory trivial  |
| `participants.importSource`        | Never queried by import source alone                                             |
| `prizes.isAwarded`                 | Always queried alongside `eventId` or `tierId`; handled by compound index if needed post-MVP |
| `winnerLogs.sessionId`             | Not a first-class query pattern; join traversal is by-event                      |
| `drawSessions.status`              | Always queried alongside `eventId`; `.filter()` on small result set is fine      |
