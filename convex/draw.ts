import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { Id } from "./_generated/dataModel"

const MIN_DRAW_INTERVAL_MS = 3_000

// ─── Queries (reactive — all clients auto-update on any session mutation) ───

/**
 * Core realtime query — stage, remote, and audience all subscribe to this.
 *
 * C3: winner is projected to { _id, name, nameZh } only.
 * PII (email, phone) and session internals (remoteToken) are stripped.
 */
export const getSession = query({
  args: { sessionId: v.id("drawSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId)
    if (!session) return null

    const tier = await ctx.db.get(session.tierId)

    // C3: project winner to {_id, name, nameZh} only — no PII to unauthenticated screens
    let winner: { _id: Id<"participants">; name: string; nameZh: string | undefined } | null = null
    if (session.currentWinnerId) {
      const full = await ctx.db.get(session.currentWinnerId)
      if (full) winner = { _id: full._id, name: full.name, nameZh: full.nameZh }
    }

    // Current prize (during result state)
    const prize = session.currentPrizeId ? await ctx.db.get(session.currentPrizeId) : null

    // Next prize to draw (when idle — shows what's up next)
    const tierPrizes = await ctx.db
      .query("prizes")
      .withIndex("by_tier", q => q.eq("tierId", session.tierId))
      .collect()
    const nextPrize = tierPrizes.find(p => !p.isAwarded) ?? null
    const prizesRemaining = tierPrizes.filter(p => !p.isAwarded).length
    const prizesTotal = tierPrizes.length

    // Never return remoteToken to stage/audience views
    const { remoteToken: _stripped, ...safeSession } = session

    return { ...safeSession, tier, winner, prize, nextPrize, prizesRemaining, prizesTotal }
  },
})

/** Used by the remote controller — token-based auth for the phone page */
export const getSessionByToken = query({
  args: { remoteToken: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("drawSessions")
      .withIndex("by_remote_token", q => q.eq("remoteToken", args.remoteToken))
      .first()
  },
})

export const getActiveSession = query({
  args: { eventId: v.id("drawEvents") },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("drawSessions")
      .withIndex("by_event", q => q.eq("eventId", args.eventId))
      .order("desc")
      .collect()
    return sessions.find(s => s.status !== "closed") ?? null
  },
})

/**
 * Used by the remote controller page — returns active session WITH remoteToken.
 * This allows the remote page to subscribe by eventId (not a per-session token URL),
 * so the remote controller persists across tier advances without needing a new QR scan.
 * Security: anyone with the eventId can access this, but remoteToken is still validated
 * in all draw mutations. Security model = physical presence at the event.
 */
export const getRemoteSession = query({
  args: { eventId: v.id("drawEvents") },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("drawSessions")
      .withIndex("by_event", q => q.eq("eventId", args.eventId))
      .order("desc")
      .collect()
    const session = sessions.find(s => s.status !== "closed")
    if (!session) return null

    const tier = await ctx.db.get(session.tierId)
    const prizes = await ctx.db
      .query("prizes")
      .withIndex("by_tier", q => q.eq("tierId", session.tierId))
      .collect()
    const unawardedCount = prizes.filter(p => !p.isAwarded).length
    const totalCount = prizes.length

    let winner: { _id: Id<"participants">; name: string; nameZh: string | undefined } | null = null
    if (session.currentWinnerId) {
      const full = await ctx.db.get(session.currentWinnerId)
      if (full) winner = { _id: full._id, name: full.name, nameZh: full.nameZh }
    }
    const prize = session.currentPrizeId ? await ctx.db.get(session.currentPrizeId) : null

    // Returns remoteToken so the remote controller can call draw mutations
    return { ...session, tier, winner, prize, unawardedCount, totalCount }
  },
})

// ─── Mutations ───

export const createSession = mutation({
  args: {
    eventId: v.id("drawEvents"),
    tierId: v.id("prizeTiers"),
  },
  handler: async (ctx, args) => {
    // Note: No auth check here — the stage page is a public URL and needs to create sessions.
    // Security is enforced via remoteToken on all draw operations (triggerDraw, confirmWinner, rejectWinner).
    // Anyone with the eventId can create a session, but only the remoteToken holder can control the draw.

    // Prevent duplicate active sessions for the same event
    const existingActive = await ctx.db
      .query("drawSessions")
      .withIndex("by_event", q => q.eq("eventId", args.eventId))
      .order("desc")
      .collect()
    const hasActive = existingActive.some(s => s.status !== "closed")
    if (hasActive) return null

    return ctx.db.insert("drawSessions", {
      eventId: args.eventId,
      tierId: args.tierId,
      status: "idle",
      remoteToken: crypto.randomUUID(),
      algorithm: "fisher-yates-webcrypto-v1",
    })
  },
})

/**
 * Remote controller presses DRAW — runs server-side for trustworthy winner selection.
 *
 * HIGH (REQ-03): remoteToken validated inside mutation — page-level route guard alone is insufficient.
 * MEDIUM: rate-limited to prevent rapid-fire fishing (3s minimum between draws).
 */
export const triggerDraw = mutation({
  args: {
    sessionId: v.id("drawSessions"),
    remoteToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId)
    if (!session) throw new Error("Session not found")

    // REQ-03: validate remoteToken to prevent direct API calls without the phone
    if (session.remoteToken !== args.remoteToken) throw new Error("Forbidden")

    if (session.status !== "idle") {
      throw new Error(`Cannot draw from status: ${session.status}`)
    }

    // MEDIUM: rate limit — reject draws within 3s of previous draw
    if (session.lastDrawAt && Date.now() - session.lastDrawAt < MIN_DRAW_INTERVAL_MS) {
      throw new Error("Draw too soon — wait 3 seconds between draws")
    }

    const tier = await ctx.db.get(session.tierId)
    if (!tier) throw new Error("Tier not found")

    const allParticipants = await ctx.db
      .query("participants")
      .withIndex("by_event", q => q.eq("eventId", session.eventId))
      .collect()

    // Build exclusion set if tier disallows repeat winners
    let excludedIds = new Set<string>()
    if (!tier.allowRepeat) {
      const confirmedInTier = await ctx.db
        .query("winnerLogs")
        .withIndex("by_event_action", q =>
          q.eq("eventId", session.eventId).eq("action", "confirmed")
        )
        .collect()

      const tierSessionIds = new Set(
        (
          await ctx.db
            .query("drawSessions")
            .withIndex("by_event", q => q.eq("eventId", session.eventId))
            .collect()
        )
          .filter(s => s.tierId === session.tierId)
          .map(s => s._id.toString())
      )

      excludedIds = new Set(
        confirmedInTier
          .filter(l => tierSessionIds.has(l.sessionId.toString()))
          .map(l => l.participantId.toString())
      )
    }

    const eligible = allParticipants.filter(
      p => p.isEligible && !excludedIds.has(p._id.toString())
    )
    if (eligible.length === 0) throw new Error("No eligible participants")

    const prizes = await ctx.db
      .query("prizes")
      .withIndex("by_tier", q => q.eq("tierId", session.tierId))
      .collect()
    const unawarded = prizes.find(p => !p.isAwarded)
    if (!unawarded) throw new Error("No prizes remaining in this tier")

    // CSPRNG selection — server-side, no Math.random()
    const randomBytes = crypto.getRandomValues(new Uint32Array(1))
    const seed = randomBytes[0].toString(16).padStart(8, "0")
    const winner = eligible[randomBytes[0] % eligible.length]

    // Denormalized log — self-contained even if participant/prize records are later deleted
    const logId = await ctx.db.insert("winnerLogs", {
      eventId: session.eventId,
      sessionId: session._id,
      participantId: winner._id,
      prizeId: unawarded._id,
      participantName: winner.name,
      participantNameZh: winner.nameZh,
      participantEmail: winner.email,
      prizeName: unawarded.name,
      prizeNameZh: unawarded.nameZh,
      tierName: tier.name,
      action: "drawn",
    })

    // Patching session triggers re-render on all useQuery subscribers (~50ms)
    await ctx.db.patch(args.sessionId, {
      status: "result",
      prngSeed: seed,
      lastDrawAt: Date.now(),
      currentWinnerId: winner._id,
      currentPrizeId: unawarded._id,
      currentResultId: logId,
    })

    return { winnerId: winner._id, prizeId: unawarded._id, logId }
  },
})

export const confirmWinner = mutation({
  args: {
    sessionId: v.id("drawSessions"),
    remoteToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId)
    if (!session) throw new Error("Session not found")

    // REQ-03: validate remoteToken
    if (session.remoteToken !== args.remoteToken) throw new Error("Forbidden")

    if (session.status !== "result") throw new Error("No pending result")
    if (!session.currentWinnerId || !session.currentPrizeId || !session.currentResultId) {
      throw new Error("Session is missing winner data")
    }

    const [winner, prize, tier] = await Promise.all([
      ctx.db.get(session.currentWinnerId),
      ctx.db.get(session.currentPrizeId),
      ctx.db.get(session.tierId),
    ])

    await ctx.db.patch(session.currentPrizeId, { isAwarded: true })

    await ctx.db.insert("winnerLogs", {
      eventId: session.eventId,
      sessionId: session._id,
      participantId: session.currentWinnerId,
      prizeId: session.currentPrizeId,
      participantName: winner?.name ?? "",
      participantNameZh: winner?.nameZh,
      participantEmail: winner?.email,
      prizeName: prize?.name ?? "",
      prizeNameZh: prize?.nameZh,
      tierName: tier?.name ?? "",
      action: "confirmed",
      // actorUserId: derive from ctx.auth once REQ-04 is implemented
    })

    // Check if all prizes in this tier are now awarded — if so, close the session
    // so the stage page auto-advances to the next tier
    const allTierPrizes = await ctx.db
      .query("prizes")
      .withIndex("by_tier", q => q.eq("tierId", session.tierId))
      .collect()
    const allAwarded = allTierPrizes.every(p => p.isAwarded || p._id === session.currentPrizeId)

    if (allAwarded) {
      await ctx.db.patch(args.sessionId, { status: "closed" })
    } else {
      await ctx.db.patch(args.sessionId, {
        status: "idle",
        currentWinnerId: undefined,
        currentPrizeId: undefined,
        currentResultId: undefined,
      })
    }
  },
})

/**
 * Manually start a specific tier — used by the remote controller's tier selector.
 * No auth required (same security model as createSession).
 * Silently no-ops if another session is already active.
 */
export const startTier = mutation({
  args: {
    eventId: v.id("drawEvents"),
    tierId: v.id("prizeTiers"),
  },
  handler: async (ctx, args) => {
    const existingActive = await ctx.db
      .query("drawSessions")
      .withIndex("by_event", q => q.eq("eventId", args.eventId))
      .order("desc")
      .collect()
    const hasActive = existingActive.some(s => s.status !== "closed")
    if (hasActive) return null // Don't interrupt an active draw

    return ctx.db.insert("drawSessions", {
      eventId: args.eventId,
      tierId: args.tierId,
      status: "idle",
      remoteToken: crypto.randomUUID(),
      algorithm: "fisher-yates-webcrypto-v1",
    })
  },
})

export const rejectWinner = mutation({
  args: {
    sessionId: v.id("drawSessions"),
    remoteToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId)
    if (!session) throw new Error("Session not found")

    // REQ-03: validate remoteToken
    if (session.remoteToken !== args.remoteToken) throw new Error("Forbidden")

    if (session.status !== "result") throw new Error("No pending result")
    if (!session.currentWinnerId || !session.currentPrizeId) {
      throw new Error("Session is missing winner data")
    }

    const [winner, prize, tier] = await Promise.all([
      ctx.db.get(session.currentWinnerId),
      ctx.db.get(session.currentPrizeId),
      ctx.db.get(session.tierId),
    ])

    await ctx.db.insert("winnerLogs", {
      eventId: session.eventId,
      sessionId: session._id,
      participantId: session.currentWinnerId,
      prizeId: session.currentPrizeId,
      participantName: winner?.name ?? "",
      participantNameZh: winner?.nameZh,
      participantEmail: winner?.email,
      prizeName: prize?.name ?? "",
      prizeNameZh: prize?.nameZh,
      tierName: tier?.name ?? "",
      action: "rejected",
      // actorUserId: derive from ctx.auth once REQ-04 is implemented
    })

    // Prize NOT marked as awarded — stays available for redraw
    await ctx.db.patch(args.sessionId, {
      status: "idle",
      currentWinnerId: undefined,
      currentPrizeId: undefined,
      currentResultId: undefined,
    })
  },
})
