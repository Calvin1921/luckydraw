# Lucky Draw MVP — Data Classification

> Date: 2026-04-07

---

## Classification Tiers

| Class | Definition | Examples |
|---|---|---|
| **PII** | Data that directly or indirectly identifies a natural person | Participant name, email, phone |
| **Sensitive** | Business-confidential data; exposure causes financial or reputational harm | Stripe keys, Clerk secret key, prize values, winner lists |
| **Internal** | Operational data; low harm if exposed to authenticated users within the org | Event config, prize tier setup, draw session state |
| **Public** | Intentionally visible to unauthenticated users | Winner display name (during draw), event branding |

---

## Data Inventory

### `organizations` table
| Field | Class | Storage Rule | Transmission Rule |
|---|---|---|---|
| `clerkOrgId` | Internal | Convex cloud | Org-scoped queries only |
| `name` | Internal | Convex cloud | Org members only |
| `slug` | Internal | Convex cloud | Org members only |
| `plan` | Sensitive | Convex cloud | Org admin only |

### `drawEvents` table
| Field | Class | Storage Rule | Transmission Rule |
|---|---|---|---|
| `orgId` | Internal | Convex cloud | Org members only |
| `name`, `nameZh` | Internal | Convex cloud | Org members only |
| `status` | Internal | Convex cloud | Org members only |
| `eventDate` | Internal | Convex cloud | Org members only |
| `licenseExpiresAt` | Sensitive | Convex cloud | Org admin only |
| `stripeSessionId` | Sensitive | Convex cloud | Never return to client |
| `primaryColor`, `locale`, `logoUrl` | Public | Convex cloud | Readable by stage/audience (branding) |

### `participants` table
| Field | Class | Storage Rule | Transmission Rule |
|---|---|---|---|
| `eventId` | Internal | Convex cloud | Org members only |
| `name` | **PII** | Convex cloud | Org members for management; name/nameZh only (no email/phone) to unauthenticated draw screens |
| `nameZh` | **PII** | Convex cloud | Same as `name` |
| `email` | **PII** | Convex cloud | Org members only — NEVER returned to stage/audience/remote screens |
| `phone` | **PII** | Convex cloud | Org members only — NEVER returned to stage/audience/remote screens |
| `importSource` | Internal | Convex cloud | Org members only |
| `isEligible` | Internal | Convex cloud | Org members only |

### `prizeTiers` and `prizes` tables
| Field | Class | Storage Rule | Transmission Rule |
|---|---|---|---|
| All prize/tier fields | Internal | Convex cloud | Org members only for management; prize name shown on draw screens after win (Public for that draw moment) |

### `drawSessions` table
| Field | Class | Storage Rule | Transmission Rule |
|---|---|---|---|
| `eventId`, `tierId`, `status` | Internal | Convex cloud | Readable by stage/audience/remote via reactive query |
| `remoteToken` | **Sensitive** | Convex cloud | MUST NOT be returned in any query result exposed to stage or audience screens. Returned only to the organizer when creating the session. |
| `algorithm` | Public | Convex cloud | May be shown publicly for transparency |
| `prngSeed` | Internal | Convex cloud | May be returned in session query (post-draw only, not predictive) |
| `currentWinnerId`, `currentPrizeId`, `currentResultId` | Internal | Convex cloud | Returned as resolved winner object to draw screens — project to name/nameZh only |

### `winnerLogs` table
| Field | Class | Storage Rule | Transmission Rule |
|---|---|---|---|
| `eventId`, `sessionId`, `prizeId` | Internal | Convex cloud | Org members only |
| `participantId` | Internal | Convex cloud | Org members only |
| `participantName` | **PII** | Convex cloud | Org members only; CSV export behind auth |
| `prizeName` | Internal | Convex cloud | Org members only |
| `action` | Internal | Convex cloud | Org members only |
| `actorUserId` | Sensitive | Convex cloud | Org admin only |

---

## Storage Rules

1. **Convex cloud** is the sole persistent datastore. No data is stored in browser localStorage or sessionStorage by application code.
2. **PII fields** (email, phone) must not be returned in queries consumed by unauthenticated screens (stage, audience, remote).
3. **`remoteToken`** is a sensitive credential — treat like a password. Never include it in query results fetched by stage or audience pages.
4. **`stripeSessionId`** must never be returned to any client. Used only for idempotency/audit on the server.
5. **Cloudflare R2** stores logo images (`logoUrl`). R2 bucket must be configured with public read access limited to the `NEXT_PUBLIC_R2_PUBLIC_URL` CDN URL only. No direct bucket access.

---

## Transmission Rules

1. All transmission uses HTTPS. Convex and Vercel enforce TLS. No HTTP fallback.
2. Convex function results travel over Convex's WebSocket protocol — encrypted in transit.
3. The CSV export endpoint (`/export/winners`) transmits PII (participant names). This endpoint must require authentication (see THREAT_MODEL.md I1).
4. The Stripe webhook receives payment data — raw body must be used for signature verification before parsing.
5. `NEXT_PUBLIC_*` environment variables are baked into the client bundle. Only non-sensitive config belongs here:
   - ✅ `NEXT_PUBLIC_CONVEX_URL` — Convex deployment URL (non-secret)
   - ✅ `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk public key (safe by design)
   - ✅ `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Stripe publishable key (safe by design)
   - ✅ `NEXT_PUBLIC_APP_URL` — App URL
   - ✅ `NEXT_PUBLIC_R2_PUBLIC_URL` — CDN URL for logos
   - ❌ `STRIPE_SECRET_KEY` — server-only (Convex environment variable)
   - ❌ `STRIPE_WEBHOOK_SECRET` — server-only (Convex environment variable)
   - ❌ `CLERK_SECRET_KEY` — server-only (Next.js server / Vercel environment variable)
   - ❌ `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` — server-only

---

## Compliance Notes

- **Scope:** HK event organizers using the product in Hong Kong. Participant data (name, email, phone) falls under Hong Kong's **Personal Data (Privacy) Ordinance (PDPO)**.
- **Data minimization:** The MVP collects only what's needed for the draw. Email and phone are optional fields.
- **Retention:** No retention policy defined at MVP stage. Recommend: winner logs and participant records are deleted when the event is archived/deleted (cascade delete is already in the plan).
- **No cross-border transfer:** Convex cloud infrastructure location should be confirmed. If HK-based organizers require data residency, this must be evaluated pre-launch.
