# Lucky Draw — User Journey Maps

> **Last updated:** 2026-04-08
> **Scope:** MVP as built (Convex backend, Clerk auth)

---

## Overview

```mermaid
graph LR
    P1["Phase 1<br/>Event Setup<br/>(days before)"] --> P2["Phase 2<br/>Draw Night<br/>(live event)"]
    P2 --> P3["Phase 3<br/>Post-Event<br/>(next day)"]

    style P1 fill:#dbeafe,stroke:#3b82f6
    style P2 fill:#dcfce7,stroke:#22c55e
    style P3 fill:#fef3c7,stroke:#eab308
```

---

## Phase 1: Event Setup (days before)

```mermaid
sequenceDiagram
    actor Org as Organizer
    participant Auth as Clerk Auth
    participant CMS as Dashboard (/events)
    participant DB as Convex DB

    Org->>Auth: Sign in (Clerk)
    Auth-->>CMS: JWT verified, redirect to /events

    Org->>CMS: Click "New Event"
    CMS->>DB: events.create(name, nameZh?, eventDate?)
    DB-->>CMS: Event created (status: draft)

    Org->>CMS: Open /events/:id/participants
    Org->>CMS: Upload CSV (name, nameZh, email, phone)
    CMS->>DB: participants.bulkImport (max 300)
    Note over CMS: Validation: CSV injection sanitized,<br/>missing name rows skipped

    Org->>CMS: Open /events/:id/prizes
    Org->>CMS: Create tier "3rd Prize" + add prizes
    Org->>CMS: Create tier "Grand Prize" + add prizes
    CMS->>DB: prizes.createTier + prizes.addPrize

    Org->>CMS: Open /events/:id/branding
    Org->>CMS: Set primary color, locale, theme
    CMS->>DB: events.updateBranding

    Note over Org: Event ready for draw night
```

**MVP capabilities:** Create event, CSV import (max 300), manual participant add, prize tiers with individual prizes, branding (color, locale, theme selection).

**Not in MVP:** Stripe self-checkout (manual license activation), import from external RSVP/guest-list tools, logo upload, font selection, background video/music.

---

## Phase 2: Draw Night (live event)

```mermaid
sequenceDiagram
    actor Op as Operator (phone)
    participant Stage as Stage Screen<br/>(/draw/:id/stage)
    participant Remote as Phone Remote<br/>(/draw/:id/remote)
    participant Audience as Audience Screen<br/>(/draw/:id/audience)
    participant Convex as Convex (realtime)

    Op->>Stage: Open fullscreen on venue display
    Stage->>Convex: Subscribe to draw.getSession
    Stage->>Stage: Show QR code (bottom-right)

    Op->>Remote: Scan QR code on phone
    Remote->>Convex: Subscribe to draw.getRemoteSession
    Note over Remote: Authenticated via remoteToken in URL

    Op->>Audience: Open on projector (separate URL)
    Audience->>Convex: Subscribe to draw.getSession

    rect rgb(220, 252, 231)
        Note over Op,Convex: Draw Loop (per prize)
        Op->>Remote: Press DRAW button
        Remote->>Convex: draw.triggerDraw(sessionId, remoteToken)
        Convex->>Convex: CSPRNG winner selection<br/>+ insert winnerLog (action: drawn)
        Convex-->>Stage: Session updated (status: result)
        Convex-->>Remote: Session updated
        Convex-->>Audience: Session updated
        Note over Stage,Audience: All 3 screens show animation<br/>+ winner reveal (~5s)

        alt Operator confirms
            Op->>Remote: Press CONFIRM
            Remote->>Convex: draw.confirmWinner
            Convex->>Convex: Prize marked awarded<br/>+ winnerLog (action: confirmed)
        else Operator rejects
            Op->>Remote: Press REJECT
            Remote->>Convex: draw.rejectWinner
            Convex->>Convex: winnerLog (action: rejected)<br/>Session returns to idle
        end
    end

    Note over Stage: When all prizes in tier awarded,<br/>session auto-closes, next tier begins
```

**Realtime sync:** All 3 screens subscribe to the same Convex query. When a mutation fires, subscribers update automatically. No Pusher, no WebSocket management — Convex handles it.

**Security model:** Stage and Audience are read-only (no mutations). Remote mutations require `remoteToken` (128-bit UUID), only obtainable by the organizer who created the session.

---

## Phase 3: Post-Event (next day)

```mermaid
sequenceDiagram
    actor Org as Organizer
    participant CMS as Dashboard (/events/:id)
    participant Export as Convex HTTP Action

    Org->>CMS: Open event dashboard
    CMS->>CMS: View winner list (confirmed logs)

    Org->>CMS: Click "Export Winners CSV"
    CMS->>Export: GET /export/winners?eventId=X
    Note over Export: Requires Clerk JWT in<br/>Authorization header
    Export-->>Org: Download CSV<br/>(Tier, Prize, Name, NameZh, Email, DrawnAt)

    Note over Org: Event archived in dashboard
```

**MVP capabilities:** View confirmed winners, export CSV with bilingual names and timestamps (HKT).

**Not in MVP:** PDF export, winner certificates, email notifications, event duplication.

---

## Screen Map

```mermaid
graph TB
    subgraph Authenticated["Authenticated (Clerk)"]
        Events["/events<br/>Event list"]
        New["/events/new<br/>Create event"]
        Detail["/events/:id<br/>Event dashboard"]
        Parts["/events/:id/participants<br/>CSV import + list"]
        Prizes["/events/:id/prizes<br/>Tier + prize editor"]
        Brand["/events/:id/branding<br/>Color, locale, theme"]
    end

    subgraph Public["Public (no auth)"]
        Stage["/draw/:id/stage<br/>Fullscreen draw display"]
        Remote["/draw/:id/remote<br/>Phone controller<br/>(token-gated mutations)"]
        Audience["/draw/:id/audience<br/>Projector mirror"]
    end

    Events --> New
    Events --> Detail
    Detail --> Parts
    Detail --> Prizes
    Detail --> Brand
    Detail -.->|"Open Stage"| Stage
    Stage -.->|"QR code"| Remote

    style Authenticated fill:#dbeafe,stroke:#3b82f6
    style Public fill:#dcfce7,stroke:#22c55e
```

---

## Key Differences from Full Vision

| Feature | Full Vision (OBJECTIVE.md) | MVP Reality |
|---------|---------------------------|-------------|
| Payment | Stripe + FPS/PayMe self-checkout | Manual license activation |
| Participant import | CSV + manual + external RSVP-tool API + bulk paste | CSV + manual only |
| Draw modes | Single + group + elimination | Single winner only |
| Branding | Logo, video bg, music, fonts, sponsor reel | Color, locale, theme |
| Export | PDF certificates + audit CSV | Winner CSV only |
| Roles | Owner / admin / operator | Single user per org |
| Trial mode | 10-participant sandbox, watermarked | Not implemented |
| Speed presets | Slow / normal / fast / drama | Per-theme fixed timings |
| Offline fallback | Client-side draw if API fails | No offline support |
