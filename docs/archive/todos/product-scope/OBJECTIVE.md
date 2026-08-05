> **SUPERSEDED:** This document contains the original full-vision product scope (V1/V2/V3) with references to the pre-Convex tech stack (PostgreSQL, Pusher, Redis). For current documentation, see the root-level document suite: [OBJECTIVE.md](../../../OBJECTIVE.md), [PRD.md](../../../PRD.md), [JOURNEY.md](../../../JOURNEY.md).

# Lucky Draw — Comprehensive Product Scope (ARCHIVED)

## Objective

Build a self-serve, fully brandable lucky draw SaaS for the Hong Kong event market that eliminates the HKD 3,000–10,000 per-event cost and on-site technician dependency, replacing it with a world-class animated draw experience at HKD 2,000–3,000/event that any event organizer can operate solo.

---

## System Architecture Diagram

```mermaid
graph TB
    subgraph PublicInternet["Public Internet"]
        OrgBrowser["Organizer Browser (setup + CMS)"]
        PresenterBrowser["Presenter Browser (fullscreen draw stage)"]
        RemoteBrowser["Remote Controller (phone browser)"]
        AudienceBrowser["Audience Screen (projector / LED wall)"]
    end

    subgraph CloudTier["Cloud Tier"]
        CDN["CDN / Edge (Cloudflare)"]
        AppServer["Next.js App Server"]
        API["REST API Layer"]
        AuthService["Auth (Clerk / NextAuth)"]
        RealtimeService["Realtime Bus (Pusher / Ably)"]
        StorageService["Object Storage (R2 / S3)\nLogos, backgrounds, sounds"]
        DB[("PostgreSQL (Neon)\nRow-level tenant isolation")]
        Cache["Redis (Upstash)\nDraw session state"]
        JobQueue["Job Queue (BullMQ)\nPDF export, email dispatch"]
        PDFWorker["PDF Worker\nWinner certificate + audit export"]
        EmailWorker["Email Worker (Resend)"]
    end

    subgraph Integrations["External Integrations"]
        EventRSVP["EventRSVP Bridge API\nGET /api/v1/events/:id/guests"]
        CSVUpload["CSV / Excel Parser"]
        Stripe["Stripe\nPer-event license + subscription"]
        FPS["FPS / PayMe\nHK payment"]
    end

    OrgBrowser --> CDN
    PresenterBrowser --> CDN
    RemoteBrowser --> CDN
    AudienceBrowser --> CDN
    CDN --> AppServer
    AppServer --> API
    API --> AuthService
    API --> DB
    API --> Cache
    API --> StorageService
    API --> RealtimeService
    API --> JobQueue
    API --> EventRSVP
    API --> CSVUpload
    API --> Stripe
    API --> FPS
    JobQueue --> PDFWorker
    JobQueue --> EmailWorker
    RealtimeService --> PresenterBrowser
    RealtimeService --> RemoteBrowser
    RealtimeService --> AudienceBrowser
```

---

## Entity Relationship Diagram

```mermaid
erDiagram
    Organization ||--o{ User : "has members"
    Organization ||--o{ DrawEvent : "owns"
    Organization ||--o{ EventRSVPIntegration : "connects"

    DrawEvent ||--|| BrandingConfig : "has one"
    DrawEvent ||--o{ SponsorSlot : "displays"
    DrawEvent ||--o{ Participant : "contains"
    DrawEvent ||--o{ PrizeTier : "defines"
    DrawEvent ||--o{ DrawSession : "runs"

    PrizeTier ||--o{ Prize : "allocates"
    PrizeTier ||--o{ DrawSession : "targets"

    DrawSession ||--o{ DrawResult : "produces"
    DrawResult ||--|| WinnerLog : "records"
    DrawResult }o--|| Participant : "selects"
    DrawResult }o--|| Prize : "awards"

    EventRSVPIntegration ||--o{ Participant : "imports"

    Organization {
        uuid id PK
        string name
        string slug
        string plan "per_event | agency | enterprise"
        string pdpo_contact
        timestamp created_at
    }

    User {
        uuid id PK
        uuid org_id FK
        string email
        string role "owner | admin | operator"
        timestamp created_at
    }

    DrawEvent {
        uuid id PK
        uuid org_id FK
        string name
        string name_zh
        string status "draft | active | completed | archived"
        string license_type "per_event | subscription"
        timestamp event_date
        timestamp license_expires_at
        int participant_count_cache
        jsonb settings
        timestamp created_at
    }

    BrandingConfig {
        uuid id PK
        uuid event_id FK
        string primary_color
        string secondary_color
        string background_type "color | image | video"
        string background_url
        string logo_url
        string font_family
        string music_url
        boolean show_sponsor_reel
        int countdown_seconds
        string locale "en | zh-HK"
        jsonb animation_config
    }

    SponsorSlot {
        uuid id PK
        uuid event_id FK
        string sponsor_name
        string logo_url
        int display_order
        string tier "title | gold | silver | supporting"
    }

    Participant {
        uuid id PK
        uuid event_id FK
        string name
        string name_zh
        string email
        string phone
        string ticket_number
        string import_source "csv | manual | eventrsvp | api"
        string external_id
        boolean is_checked_in
        boolean is_eligible
        jsonb custom_fields
        timestamp created_at
    }

    PrizeTier {
        uuid id PK
        uuid event_id FK
        string name
        string name_zh
        int draw_order
        int quantity
        string pool_type "all | vip_only | checked_in_only | custom_tag"
        string custom_pool_tag
        boolean allow_repeat_winner
        timestamp created_at
    }

    Prize {
        uuid id PK
        uuid tier_id FK
        string name
        string name_zh
        string description
        string image_url
        string value_display
        int sequence_in_tier
        boolean is_awarded
        timestamp created_at
    }

    DrawSession {
        uuid id PK
        uuid event_id FK
        uuid tier_id FK
        string status "idle | spinning | result | confirmed | rejected | closed"
        string draw_mode "single | group | elimination"
        int group_size
        int speed_preset "1_slow | 2_normal | 3_fast | 4_drama"
        boolean suspense_mode
        string remote_token
        timestamp started_at
        timestamp result_at
        timestamp closed_at
    }

    DrawResult {
        uuid id PK
        uuid session_id FK
        uuid participant_id FK
        uuid prize_id FK
        string status "pending | confirmed | rejected | replaced"
        uuid replaced_by_result_id FK
        timestamp drawn_at
        timestamp confirmed_at
    }

    WinnerLog {
        uuid id PK
        uuid result_id FK
        uuid event_id FK
        uuid participant_id FK
        uuid prize_id FK
        string participant_name
        string prize_name
        string action "drawn | confirmed | rejected | replaced"
        string actor_user_id
        string ip_address
        timestamp logged_at
    }

    EventRSVPIntegration {
        uuid id PK
        uuid org_id FK
        string api_base_url
        string api_key_encrypted
        string status "active | inactive | error"
        timestamp last_synced_at
        timestamp created_at
    }
```

---

## Draw Session State Machine

```mermaid
stateDiagram-v2
    [*] --> Idle : Session created

    Idle --> Spinning : Operator presses DRAW\n(remote or keyboard)
    Spinning --> Result : Algorithm selects winner\n(animated reveal)

    Result --> Confirmed : Operator confirms winner
    Result --> Rejected : Operator rejects winner

    Confirmed --> Idle : Ready for next draw\n(same tier or next tier)
    Confirmed --> Closed : All prizes in tier awarded

    Rejected --> Spinning : Auto-redraw triggered\n(excluded rejected participant)
    Rejected --> Idle : Operator cancels redraw

    Closed --> [*] : Tier complete

    note right of Spinning
        - Speed: slow / normal / fast / drama
        - Suspense mode: fake stops before reveal
        - Realtime sync: remote + audience screen
    end note

    note right of Result
        - Winner card displayed fullscreen
        - Name + prize shown (bilingual)
        - Confetti / animation fires
        - Audience screen synced
    end note

    note right of Confirmed
        - WinnerLog entry written (immutable)
        - Participant marked ineligible (if no-repeat)
        - Prize marked as_awarded
    end note
```

---

## User Journey: Event Setup to Draw Night to Winner Export

```mermaid
sequenceDiagram
    actor Org as Organizer
    actor Op as Operator (draw night)
    participant CMS as Lucky Draw CMS
    participant DrawStage as Draw Stage (fullscreen)
    participant Remote as Remote Controller (phone)
    participant AudienceScreen as Audience Screen
    participant Export as Export / Audit

    rect rgb(240, 248, 255)
        Note over Org, CMS: Phase 1 — Event Setup (days before)
        Org->>CMS: Create DrawEvent + purchase license
        Org->>CMS: Configure branding (logo, colors, background, music)
        Org->>CMS: Add prize tiers + individual prizes
        Org->>CMS: Import participants (CSV / manual / EventRSVP)
        Org->>CMS: Configure draw rules (pools, no-repeat, VIP-only)
        Org->>CMS: Add sponsor logos + set display order
        CMS->>CMS: Validate participant list + prize quantities
        Org->>CMS: Preview draw animation in sandbox mode
    end

    rect rgb(240, 255, 240)
        Note over Op, AudienceScreen: Phase 2 — Draw Night
        Op->>DrawStage: Open fullscreen draw stage URL
        Op->>Remote: Open remote controller on phone (QR code)
        DrawStage->>AudienceScreen: Mirror to projector (same URL or cast)
        Op->>Remote: Start sponsor reel + countdown
        AudienceScreen->>AudienceScreen: Display branding + sponsor logos

        loop For each prize tier
            Op->>Remote: Press DRAW
            Remote->>DrawStage: Trigger draw via realtime API
            DrawStage->>DrawStage: Animate wheel / name scroll (speed + suspense)
            AudienceScreen->>AudienceScreen: Mirror animation live
            DrawStage->>DrawStage: Reveal winner (fullscreen card + confetti)
            Op->>Remote: Confirm or Reject winner
            DrawStage->>Export: WinnerLog entry written (immutable timestamp)
            Note over DrawStage: Rejected → auto-redraw, excluded from pool
        end
    end

    rect rgb(255, 248, 240)
        Note over Op, Export: Phase 3 — Post-Event
        Op->>CMS: Review winner list
        Op->>Export: Export winner PDF (branded, timestamped)
        Op->>Export: Export audit CSV (all draw actions, timestamps, IPs)
        Org->>CMS: Archive event
        Note over Export: PDPO-compliant: no PII in audit log header
    end
```

---

## Scope

- **IN:**
  - Full draw engine with animation, speed modes, and suspense mode
  - Guest/participant management (CSV, manual, EventRSVP import)
  - Prize tiers and prize management
  - Branding and customization per event
  - Presenter mode (fullscreen draw stage)
  - Remote controller (phone-based, no app install)
  - Winner management (confirm/reject/redraw)
  - Immutable audit trail (WinnerLog)
  - Sponsor management
  - Export (PDF certificate, CSV audit)
  - Per-event license + agency subscription billing
  - Multi-event admin dashboard
  - PDPO-compliant data handling

- **OUT (not in this scope):**
  - EventRSVP full feature set (separate product)
  - Live streaming integration
  - Physical ticket printing / NFC integration
  - Native iOS/Android app (web-first)
  - White-label reseller portal (V2)
  - Public voting / audience participation mode
  - Payment processing for ticket sales (draw product only)

---

## Full Feature List by Module

### Module 1 — Draw Engine

| Feature | Description |
|---|---|
| Animated name roll | Names scroll/spin at configurable speed; GPU-accelerated CSS/canvas |
| Speed presets | Slow / Normal / Fast / Drama — controls scroll velocity and deceleration curve |
| Suspense mode | Fake-stops 2–3 times before final reveal; builds tension |
| Countdown before draw | Configurable 3–10 second countdown with audio cue |
| Group draw mode | Draw N winners simultaneously (e.g. table draw for 10 seats) |
| Single winner mode | Default; one winner per draw trigger |
| Elimination mode | Winners removed from pool after each draw; final N remaining win |
| Instant reveal | Skip animation, reveal winner immediately (practice / dry-run use) |
| Draw speed remote control | Operator can slow down / speed up live during spin |
| Sandbox / preview mode | Organizer tests animation before event; no WinnerLog writes |

### Module 2 — Participant Management

| Feature | Description |
|---|---|
| CSV / Excel import | Upload .csv or .xlsx; column mapping UI; validation + error report |
| Manual entry | Add participants one by one via form |
| Bulk paste | Paste names from clipboard (newline-separated) |
| EventRSVP import | "Import from EventRSVP" button; OAuth token; calls GET /api/v1/events/:id/guests |
| API import (V2) | POST /api/v1/events/:id/participants for external systems |
| Duplicate detection | Flag exact email/phone duplicates on import |
| Eligibility rules | Mark participants ineligible (e.g. staff, VIPs excluded from certain tiers) |
| Custom tags | Tag participants (e.g. "VIP", "table-1") for pool filtering |
| Check-in filter | Use check-in status as pool filter (checked-in only draws) |
| Participant search | Search/filter in management view |
| Edit / delete | Organizer can edit or remove participants before event goes live |

### Module 3 — Prize Management

| Feature | Description |
|---|---|
| Prize tiers | Ordered tiers (e.g. 3rd Prize → 2nd Prize → Grand Prize) with draw order |
| Prize items per tier | Multiple prizes per tier (e.g. 5 × 3rd Prize); individual names, images, values |
| Prize images | Upload prize photo; displayed on winner card and audience screen |
| Prize value display | Optional "Valued at HKD X" string on winner card |
| Tier pool assignment | Each tier draws from: all participants / VIP-only / checked-in-only / custom tag |
| No-repeat winner rule | Per-tier or global: a participant can only win once |
| Prize sequence | Within a tier, prizes can be awarded in order (Prize 1 of 5, Prize 2 of 5…) |
| Prize status | Unawarded / Awarded / Voided — tracked in real time |

### Module 4 — Branding & Customization

| Feature | Description |
|---|---|
| Client logo | Upload; displayed on draw stage header, winner card, PDF export |
| Primary + secondary color | Theme color applied across draw stage UI |
| Background | Solid color / image upload / video loop (mp4) |
| Font selection | 6 curated font pairs (Latin + Traditional Chinese) |
| Winner card design | Configurable layout: portrait / landscape; name size; prize prominence |
| Background music | Upload MP3 or select from built-in library (5 tracks) |
| Sound effects | Spin start / suspense tick / reveal fanfare — toggle on/off individually |
| Sponsor reel | Auto-playing sponsor logo slideshow before draw starts |
| Locale | English / Traditional Chinese / bilingual (name displayed in both) |
| Custom event tagline | Short line displayed on stage (e.g. "Annual Dinner 2026") |
| Branding preview | Live preview in CMS before going to event |

### Module 5 — Presenter Mode (Draw Stage)

| Feature | Description |
|---|---|
| Fullscreen mode | Single-click fullscreen; hides all browser chrome |
| Audience screen URL | Separate URL for projector / LED wall (no controls, just the stage) |
| Remote controller | Phone-accessible URL (QR code); buttons: DRAW / CONFIRM / REJECT / NEXT TIER |
| Keyboard shortcuts | Space = draw, Enter = confirm, Esc = reject; for laptop operators |
| Live participant count | Shows remaining eligible participants per tier |
| Prize progress indicator | "3 of 5 prizes awarded" displayed on stage |
| Tier navigation | Operator advances through prize tiers manually or auto-advance |
| Timer overlay | Optional countdown / elapsed time overlay on stage |
| Emergency stop | Halt draw mid-animation; return to idle without recording result |
| Low-bandwidth mode | Reduce animation fidelity; disables video bg; works on 3G |

### Module 6 — Exclusion Rules

| Feature | Description |
|---|---|
| No-repeat winner | Winner excluded from all subsequent draws (global rule) |
| No-repeat per tier | Winner excluded from the same tier only |
| Manual exclude | Organizer marks specific participants as ineligible before event |
| Real-time exclude | Operator excludes a participant live during event (e.g. they left) |
| Tag-based pools | Only participants with a specific tag are eligible for a given tier |
| Check-in gate | Only checked-in participants are eligible (requires check-in data) |
| Staff exclusion | Bulk-exclude a CSV list of staff names/emails |

### Module 7 — Winner Management

| Feature | Description |
|---|---|
| Confirm winner | Operator presses Confirm; WinnerLog entry written; prize marked awarded |
| Reject winner | Operator presses Reject; participant excluded; auto-redraw triggered |
| Reject with reason | Optional reason field (logged in audit trail) |
| Replace winner | After confirmation, swap a winner (requires admin role; logged) |
| Winner list view | Real-time updating list in CMS during event |
| Winner notification (V2) | Send winner's name/prize via email/WhatsApp post-event |

### Module 8 — Audit Trail

| Feature | Description |
|---|---|
| Immutable WinnerLog | Every draw action timestamped at server level; no client-editable fields |
| Action types | drawn / confirmed / rejected / replaced — each logged separately |
| Actor logging | Which user triggered each action (user_id, IP) |
| Timezone | All timestamps in HKT (UTC+8) |
| Tamper-evident (V2) | Hash chain on WinnerLog for enterprise compliance |
| Audit export | Full WinnerLog as CSV with all columns |
| Winner certificate PDF | Branded PDF per winner: name, prize, event, timestamp |
| Bulk winner export | All winners in one PDF (draw results report) |

### Module 9 — Sponsor Management

| Feature | Description |
|---|---|
| Sponsor slots | Unlimited sponsors per event |
| Tier labels | Title Sponsor / Gold / Silver / Supporting — affects logo size on reel |
| Logo upload | PNG/SVG; auto-background-removal for dark-stage display |
| Display order | Drag-to-reorder in CMS |
| Reel duration | Configurable seconds per sponsor on reel |
| Static overlay | Optional persistent small sponsor bar at bottom of draw stage |

### Module 10 — CMS (Event Setup & Management)

| Feature | Description |
|---|---|
| Event dashboard | Overview: participant count, prize count, draw progress, license expiry |
| Multi-event list | All events for the org with status badges |
| Event duplication | Clone a previous event's settings + prizes (not participants) |
| Role-based access | Owner / Admin / Operator — Operators cannot edit settings during live event |
| Event locking | Lock settings once event goes live (prevent accidental edits) |
| Event archiving | Archive post-event; data retained per PDPO retention schedule |
| Bilingual CMS | English + Traditional Chinese UI |

### Module 11 — Billing & Licensing

| Feature | Description |
|---|---|
| Per-event license | HKD 2,000–3,000; 30-day access window; unlocks one DrawEvent |
| Agency subscription | HKD 800–1,200/mo; unlimited events; multi-user org |
| Stripe checkout | Card payments for international clients |
| FPS / PayMe | Local HK payment for per-event and subscription |
| License enforcement | Event stage locked if license expired; CMS read-only |
| Invoice generation | Auto-generated PDF invoice per purchase |
| Trial mode | 10-participant sandbox; watermarked export; no WinnerLog persistence |

### Module 12 — Performance & Reliability

| Feature | Description |
|---|---|
| Offline-tolerant draw | Draw algorithm runs client-side if API call fails; syncs on reconnect |
| No app install | 100% browser-based; tested on Chrome / Safari iOS |
| Weak WiFi mode | Low-bandwidth preset auto-detected; reduces asset payload |
| Session recovery | If operator refreshes mid-draw, session state restored from server |
| Concurrent events | Multiple orgs can run simultaneous events on shared infra |
| Realtime sync | Remote + audience screen updates within 200ms of draw trigger |

---

## Build Sequence

### MVP — First Paying Event

**Goal:** Ship to one real paying client. Manual setup OK. Core draw works perfectly.

**Scope:**
- DrawEvent create/edit (single event, manually provisioned by team)
- Participant import: CSV + manual entry only
- Prize tiers + prizes (name, quantity, image)
- Draw engine: single winner mode, 2 speed presets (normal + drama), suspense mode
- Branding: logo, primary color, background image
- Draw stage: fullscreen, keyboard shortcuts, audience URL
- Remote controller: phone browser (DRAW / CONFIRM / REJECT)
- No-repeat winner rule (global)
- WinnerLog (basic, server-side)
- Winner list view in CMS
- Export: winner CSV
- Auth: single user per org (no roles yet)
- Billing: manual invoice (no Stripe integration yet)

**Acceptance criteria:**
- A non-technical organizer can run a complete draw for 300 participants, 3 prize tiers, from phone remote without any team support
- WinnerLog is written and exportable

**Estimated scope:** 3–4 weeks, 1 full-stack developer

---

### V1 — Full Self-Serve Launch

**Goal:** Any organizer can sign up, pay, and run a draw without touching the team.

**Additional scope over MVP:**
- Stripe + FPS/PayMe billing + per-event license enforcement
- EventRSVP import (OAuth + API bridge)
- All draw modes (single, group, elimination)
- All exclusion rules (tag-based pools, check-in filter, manual exclude)
- Full branding suite (video bg, music, fonts, sponsor reel, custom tagline)
- Presenter mode: timer overlay, live participant count, tier progress
- Winner management: replace winner (admin), reject with reason
- Export: winner PDF (branded), audit CSV (full WinnerLog)
- Multi-user org (owner / admin / operator roles)
- Event duplication (clone settings + prizes)
- Trial mode (watermarked, 10-participant sandbox)
- Bilingual CMS + draw stage (EN + 繁中)
- Low-bandwidth mode
- Session recovery
- Full audit trail per PDPO requirement

**Acceptance criteria:**
- End-to-end: new user signs up → pays per-event → imports guests → runs full draw → exports winner PDF, all without team intervention
- Load test: 500 participants, 10 prize tiers, remote + audience screen, under 200ms realtime sync

**Estimated scope:** 8–10 weeks additional

---

### V2 — Enterprise, White-Label, API

**Goal:** Land agency subscriptions and enterprise clients (banks, corporates).

**Additional scope over V1:**
- White-label: custom domain per client, remove Lucky Draw branding
- API for participant import (POST /api/v1/events/:id/participants)
- Webhook: fire on winner confirmed (for integration with client CRMs)
- Tamper-evident audit log (hash chain on WinnerLog)
- Enterprise SSO (SAML 2.0 / OIDC)
- Dedicated database instance option (HK data residency for PDPO enterprise)
- Winner notification: email/WhatsApp post-event
- Advanced analytics: draw session stats, participant engagement report
- Reseller/agency portal: manage sub-orgs, consolidated billing
- Multi-language expansion: Simplified Chinese

**Acceptance criteria:**
- Agency can manage 10 sub-client events from one dashboard
- Enterprise client can prove full WinnerLog chain-of-custody for regulatory audit

**Estimated scope:** 12+ weeks additional

---

## Risk / Open Questions

| Risk | Impact | Mitigation |
|---|---|---|
| Venue projector runs on a locked-down browser (IE-era kiosk) | High | Test on Chrome 80+, Safari 14+; provide fallback static winner display |
| Venue WiFi drops mid-draw | High | Client-side draw algorithm fallback; session recovery from Redis |
| Organizer runs draw from same device as audience screen | Medium | Audience URL is separate; dual-screen or second device recommended in onboarding |
| EventRSVP API auth token management (shared org vs. per-user) | Medium | Abstract as OAuth integration; org-level token storage |
| PDPO: participant PII in WinnerLog | High | WinnerLog stores participant_id FK only; PII joined at query time; audit export de-identifies on request |
| Draw algorithm fairness disputes | High | Use cryptographically secure PRNG (Web Crypto API); log seed + algorithm version in DrawSession |
| Bilingual name display (Chinese name longer than English) | Low | Winner card layout tested at max-length for both locales |
| Competitor Searix undercuts on price to retain HK client | Medium | Differentiate on UX, self-serve, and HK data residency |
| License expiry mid-event (timezone edge case) | Low | Grace period: license valid until end of event_date calendar day HKT |

---

## Checklist

- [ ] ERD reviewed and approved by team — no missing relations
- [ ] Draw state machine covers all failure paths (network drop, double-confirm, etc.)
- [ ] PDPO data mapping completed — confirm which fields are PII and retention schedule
- [ ] Branding config covers all draw stage elements — no hardcoded colors remain
- [ ] Remote controller QR flow tested on iOS Safari + Android Chrome
- [ ] Audience screen URL tested on common venue projector browsers
- [ ] CSV import column mapping covers common HK event export formats (EventsAir, Cvent, Excel)
- [ ] EventRSVP API bridge endpoint confirmed with EventRSVP team (auth method, rate limits)
- [ ] WinnerLog schema reviewed for compliance — immutable fields confirmed at DB level
- [ ] Stripe + FPS payment flow tested end-to-end in sandbox
- [ ] Load test: 500 participants, simultaneous remote + audience screen, confirm <200ms sync
- [ ] Bilingual winner card renders correctly for Traditional Chinese names (max 8 chars) + English names (max 40 chars)
- [ ] Sandbox / trial mode confirmed: no WinnerLog persistence, watermark visible on export
- [ ] Run lint + types + build (zero errors, zero warnings)
- [ ] Visual verification: draw animation on 1080p projector resolution + 4K display
- [ ] Check empty states: no participants, no prizes, expired license
