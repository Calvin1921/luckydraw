"use client"

import { use, useEffect, useRef, useCallback, useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id, Doc } from "@/convex/_generated/dataModel"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { colors } from "@/lib/design-tokens"

// ── Error message helper ──────────────────────────────────────────────────────
// Maps raw Convex/network errors to human-readable operator messages.
function errorToHumanMessage(e: unknown, context?: "confirm" | "reject"): string {
  const msg = (e as Error)?.message ?? ""
  if (msg.match(/network|fetch|failed to fetch|networkerror/i)) {
    return "Connection lost. Reconnecting..."
  }
  if (msg.match(/not found/i)) {
    return "Event or session not found. Return to dashboard."
  }
  if (context === "confirm") {
    return "Could not confirm. Tap to retry. Stage may be out of sync."
  }
  if (context === "reject") {
    return "Could not reject. Tap to retry. Stage may be out of sync."
  }
  return "Something went wrong. Check your connection and try again."
}

export default function RemotePage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId: rawEventId } = use(params)

  // Guard against non-Convex-format IDs before they reach Convex validators
  let eventId: Id<"drawEvents"> | null = null
  try {
    if (rawEventId && rawEventId.length > 0) {
      eventId = rawEventId as Id<"drawEvents">
    }
  } catch {
    eventId = null
  }

  const session = useQuery(api.draw.getRemoteSession, eventId ? { eventId } : "skip")
  const event = useQuery(api.events.get, eventId ? { eventId } : "skip")
  const tiers = useQuery(api.prizes.listTiers, eventId ? { eventId } : "skip")

  const triggerDraw = useMutation(api.draw.triggerDraw)
  const confirmWinner = useMutation(api.draw.confirmWinner)
  const rejectWinner = useMutation(api.draw.rejectWinner)
  const startTier = useMutation(api.draw.startTier)

  const [isDrawing, setIsDrawing] = useState(false)
  const [isStarting, setIsStarting] = useState<string | null>(null) // tierId being started
  const [error, setError] = useState<string | null>(null)
  // Two-step reject: null = not pending, "pending" = first tap done
  const [rejectPending, setRejectPending] = useState(false)
  const rejectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Two-step confirm: null = not pending, "pending" = first tap done
  const [confirmPending, setConfirmPending] = useState(false)
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSessionId = useRef<string | null>(null)
  // Aria-live announcement for winner
  const [winnerAnnouncement, setWinnerAnnouncement] = useState("")

  // Clear error and reject/confirm state when session changes
  useEffect(() => {
    if (session?._id && session._id !== lastSessionId.current) {
      lastSessionId.current = session._id
      setError(null)
      setRejectPending(false)
      setConfirmPending(false)
    }
  }, [session?._id])

  // Announce winner to screen readers when result arrives
  useEffect(() => {
    if (session?.status === "result" && session.winner) {
      const name = session.winner.nameZh ?? session.winner.name
      const prize = session.prize?.nameZh ?? session.prize?.name ?? ""
      setWinnerAnnouncement(prize ? `Winner: ${name}. Prize: ${prize}.` : `Winner: ${name}.`)
    } else {
      setWinnerAnnouncement("")
    }
  }, [session?.status, session?.winner, session?.prize])

  // Reset reject pending state after 3s if not tapped again
  useEffect(() => {
    if (rejectPending) {
      rejectTimeoutRef.current = setTimeout(() => setRejectPending(false), 3000)
    }
    return () => {
      if (rejectTimeoutRef.current) clearTimeout(rejectTimeoutRef.current)
    }
  }, [rejectPending])

  // Reset confirm pending state after 5s if not tapped again
  useEffect(() => {
    if (confirmPending) {
      confirmTimeoutRef.current = setTimeout(() => setConfirmPending(false), 5000)
    }
    return () => {
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current)
    }
  }, [confirmPending])

  const handleDraw = useCallback(async () => {
    if (!session || session.status !== "idle" || isDrawing) return
    setIsDrawing(true)
    setError(null)
    try {
      await triggerDraw({ sessionId: session._id, remoteToken: session.remoteToken })
    } catch (e) {
      setError(errorToHumanMessage(e))
    } finally {
      setIsDrawing(false)
    }
  }, [session, isDrawing, triggerDraw])

  const handleConfirmFirstTap = useCallback(() => {
    setConfirmPending(true)
  }, [])

  const handleConfirmFinal = useCallback(async () => {
    if (!session) return
    setConfirmPending(false)
    setRejectPending(false)
    setError(null)
    try {
      await confirmWinner({ sessionId: session._id, remoteToken: session.remoteToken })
    } catch (e) {
      setError(errorToHumanMessage(e, "confirm"))
    }
  }, [session, confirmWinner])

  const handleRejectFirstTap = useCallback(() => {
    setRejectPending(true)
  }, [])

  const handleRejectConfirm = useCallback(async () => {
    if (!session) return
    setRejectPending(false)
    setError(null)
    try {
      await rejectWinner({ sessionId: session._id, remoteToken: session.remoteToken })
    } catch (e) {
      setError(errorToHumanMessage(e, "reject"))
    }
  }, [session, rejectWinner])

  const handleStartTier = useCallback(async (tierId: Id<"prizeTiers">) => {
    if (!eventId) return
    setIsStarting(tierId)
    setError(null)
    try {
      await startTier({ eventId, tierId })
    } catch (e) {
      setError(errorToHumanMessage(e))
    } finally {
      setIsStarting(null)
    }
  }, [eventId, startTier])

  const primaryColor = event?.primaryColor ?? "#e2a84b"

  // Invalid event ID in URL
  if (!eventId) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 px-8">
        <p className="text-white/60 text-lg text-center">Event not found.</p>
        <Link href="/events" className="text-white/40 underline text-sm hover:text-white/70 transition-colors">
          Back to Events
        </Link>
      </div>
    )
  }

  // Loading
  if (session === undefined || event === undefined || tiers === undefined) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: `${primaryColor} transparent ${primaryColor} ${primaryColor}` }}
          />
          <p className="text-white/40 text-sm">Connecting...</p>
        </div>
      </div>
    )
  }

  // Event not found after loading
  if (!event) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 px-8">
        <p className="text-white/60 text-lg text-center">Event not found.</p>
        <Link href="/events" className="text-white/40 underline text-sm hover:text-white/70 transition-colors">
          Back to Events
        </Link>
      </div>
    )
  }

  // ── No active session ─────────────────────────────────────────────────────
  if (!session) {
    const incompleteTiers = tiers.filter(t => t.prizes.some((p: Doc<"prizes">) => !p.isAwarded))
    const allDone = tiers.length > 0 && incompleteTiers.length === 0

    // Truly all done
    if (allDone) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
      const exportUrl = `${appUrl}/events/${eventId}/winners/export`

      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 px-8">
          {/* Celebration icon: 90px circle with green radial glow + subtle pulse */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <motion.div
              className="w-[90px] h-[90px] rounded-full flex items-center justify-center text-5xl"
              style={{
                background:
                  `radial-gradient(ellipse at center, ${colors.success}2e 0%, ${colors.success}0f 60%, transparent 100%)`,
                boxShadow: `0 0 40px ${colors.success}26`,
              }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            >
              🎉
            </motion.div>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="font-display text-white font-bold text-3xl text-center"
          >
            All Done!
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-white/50 text-center"
          >
            All prizes have been awarded.
          </motion.p>
          {event && <p className="text-white/60 text-sm text-center">{event.name}</p>}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="flex flex-col gap-3 w-full max-w-xs"
          >
            <Link
              href={`/events/${eventId}`}
              className="w-full py-4 rounded-2xl font-semibold text-center transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
              style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, color-mix(in srgb, ${primaryColor} 80%, #fff) 100%)`,
                boxShadow: `0 4px 20px ${primaryColor}44`,
                color: colors.bg,
              }}
            >
              Back to Event
            </Link>
            <Link
              href={exportUrl}
              className="w-full py-4 rounded-2xl font-semibold text-center transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
              style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, color-mix(in srgb, ${primaryColor} 80%, #fff) 100%)`,
                boxShadow: `0 4px 20px ${primaryColor}44`,
                color: colors.bg,
              }}
            >
              Export Winners
            </Link>
          </motion.div>
        </div>
      )
    }

    // More rounds to draw — show round selector
    return (
      <div className="min-h-screen bg-black flex flex-col px-6 pt-10 pb-8">
        {/* Header */}
        <div className="mb-8">
          <p className="font-display italic text-white/30 text-sm mb-1">{event?.name}</p>
          <h1 className="font-display text-white font-bold text-2xl">Select Round</h1>
          <p className="text-white/40 text-sm mt-1">Choose a round to start drawing</p>
        </div>

        {/* Round cards */}
        <div className="space-y-3 flex-1">
          {tiers.map((tier, idx) => {
            const prizes = tier.prizes as Doc<"prizes">[]
            const remaining = prizes.filter(p => !p.isAwarded).length
            const total = prizes.length
            const isDone = total > 0 && remaining === 0
            const isEmpty = total === 0
            const canStart = !isDone && !isEmpty

            return (
              <motion.button
                key={tier._id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.07 }}
                onClick={() => canStart && handleStartTier(tier._id as Id<"prizeTiers">)}
                disabled={!canStart || isStarting !== null}
                className="w-full rounded-2xl p-5 text-left transition-all disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/20"
                style={{
                  background: isDone
                    ? "rgba(255,255,255,0.04)"
                    : canStart
                      ? `${primaryColor}18`
                      : "rgba(255,255,255,0.04)",
                  border: isDone
                    ? "2px solid rgba(255,255,255,0.08)"
                    : canStart
                      ? `2px solid ${primaryColor}44`
                      : "2px solid rgba(255,255,255,0.08)",
                  opacity: isEmpty ? 0.4 : 1,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Round icon — 46px container */}
                    <div
                      className="w-[46px] h-[46px] rounded-full flex items-center justify-center text-sm font-black shrink-0"
                      style={{
                        background: isDone ? `${colors.success}33` : canStart ? `${primaryColor}33` : "rgba(255,255,255,0.08)",
                        color: isDone ? colors.success : canStart ? primaryColor : "rgba(255,255,255,0.5)",
                      }}
                    >
                      {isDone ? "✓" : idx + 1}
                    </div>

                    <div>
                      <div className={`font-display font-bold text-lg ${isDone ? "text-white/30" : "text-white"}`}>
                        {tier.name}
                        {tier.nameZh && <span className="font-zh text-white/40 text-sm ml-2">{tier.nameZh}</span>}
                      </div>
                      <div className="text-sm mt-0.5">
                        {isDone ? (
                          <span
                            className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{ background: `${colors.success}1f`, color: colors.success }}
                          >
                            All awarded
                          </span>
                        ) : isEmpty ? (
                          <span className="text-white/25">No prizes set up</span>
                        ) : (
                          <span className="text-white/50">
                            {remaining} of {total} prize{total !== 1 ? "s" : ""} remaining
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CTA button: gold gradient start, done badge, locked state */}
                  {canStart ? (
                    <div
                      className="px-4 py-2 rounded-xl font-semibold text-sm shrink-0 transition-all"
                      style={
                        isStarting === tier._id
                          ? { background: `${primaryColor}66`, color: colors.bg }
                          : {
                              background: `linear-gradient(135deg, ${primaryColor} 0%, color-mix(in srgb, ${primaryColor} 80%, #fff) 100%)`,
                              color: colors.bg,
                              boxShadow: `0 4px 16px ${primaryColor}44`,
                            }
                      }
                    >
                      {isStarting === tier._id ? "Starting..." : "Start"}
                    </div>
                  ) : isDone ? (
                    <div
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0"
                      style={{ background: `${colors.success}1f`, color: colors.success }}
                    >
                      Done
                    </div>
                  ) : (
                    <div className="px-3 py-1.5 rounded-xl bg-white/8 text-white/30 text-xs font-semibold shrink-0">
                      Locked
                    </div>
                  )}
                </div>

                {/* Mini prize progress bar — 3px */}
                {total > 0 && (
                  <div className="flex gap-1 mt-3">
                    {Array.from({ length: total }).map((_, i) => (
                      <div
                        key={i}
                        className="rounded-full flex-1 transition-all"
                        style={{
                          height: "3px",
                          background: i < total - remaining
                            ? isDone ? `${colors.success}88` : primaryColor
                            : "rgba(255,255,255,0.12)",
                        }}
                      />
                    ))}
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>

        {error && (
          <p className="text-sm text-center mt-4 px-4 py-2 bg-red-500/10 rounded-xl" style={{ color: colors.danger }}>
            {error}
          </p>
        )}
      </div>
    )
  }

  // ── Active session ────────────────────────────────────────────────────────
  const isResult = session.status === "result"
  const isIdle = session.status === "idle"
  const prizesRemaining = session.unawardedCount ?? 0
  const prizesTotal = session.totalCount ?? 0
  const prizesAwarded = prizesTotal - prizesRemaining

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Aria-live winner announcement — visually hidden, screen reader only */}
      <div aria-live="assertive" className="sr-only" aria-atomic="true">
        {winnerAnnouncement}
      </div>

      {/* Header */}
      <div className="px-6 pt-8 pb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="font-display italic text-white/60 text-sm">
            {event?.name}
          </p>
          {/* M20: Connection status indicator */}
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: error?.includes("Connection lost") ? colors.warning : colors.success }}
              aria-hidden
            />
            <span className="text-xs text-white/40">
              {error?.includes("Connection lost") ? "Reconnecting..." : "Connected"}
            </span>
          </div>
        </div>
        <h1 className="font-display text-white font-bold text-xl">
          {session.tier?.nameZh ?? session.tier?.name ?? "Draw"}
        </h1>
        {/* Prize progress dots — 9px active gold */}
        {prizesTotal > 0 && (
          <div className="flex items-center gap-1.5 mt-3">
            {Array.from({ length: prizesTotal }).map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-500"
                style={{
                  width: i === prizesAwarded ? 9 : 6,
                  height: i === prizesAwarded ? 9 : 6,
                  background: i < prizesAwarded
                    ? primaryColor
                    : i === prizesAwarded
                      ? `${primaryColor}88`
                      : "rgba(255,255,255,0.15)",
                  boxShadow: i === prizesAwarded ? `0 0 8px ${primaryColor}66` : "none",
                }}
              />
            ))}
          </div>
        )}
        <p className="text-white/40 text-xs mt-2">
          {prizesRemaining} of {prizesTotal} remaining
        </p>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-8">
        <AnimatePresence mode="wait">
          {isResult && session.winner ? (
            <motion.div
              key="winner"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="w-full text-center"
            >
              {/* "Winner" label — uppercase, wider tracking */}
              <div className="text-white/40 text-xs uppercase tracking-[0.15em] mb-3">
                Winner
              </div>
              {/* Winner name — Fraunces 36px, gradient text white → gold */}
              <div
                className="font-display font-bold mb-2 leading-tight"
                style={{
                  fontSize: "36px",
                  background: `linear-gradient(135deg, #ffffff 0%, ${primaryColor} 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {session.winner.nameZh ?? session.winner.name}
              </div>
              {/* Chinese name — font-zh, muted */}
              {session.winner.nameZh && (
                <div className="font-zh text-white/50 text-lg mb-3">
                  {session.winner.name}
                </div>
              )}
              {/* Prize — italic, gold-subtle pill badge */}
              {(session.prize?.nameZh ?? session.prize?.name) && (
                <div className="inline-flex items-center">
                  <span
                    className="italic text-sm px-3 py-1 rounded-full font-medium"
                    style={{
                      background: `${primaryColor}18`,
                      color: primaryColor,
                      border: `1px solid ${primaryColor}33`,
                    }}
                  >
                    {session.prize?.nameZh ?? session.prize?.name}
                  </span>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="ready"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              {/* Prize name — Fraunces italic 24px */}
              <div
                className="font-display italic text-white/30"
                style={{ fontSize: "24px" }}
              >
                {session.prize?.nameZh ?? session.prize?.name ?? "Next Prize"}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* DRAW button — 200px circle with 3 concentric pulsing rings */}
        <AnimatePresence mode="wait">
          {isIdle && (
            <motion.button
              key="draw-btn"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.92 }}
              onClick={handleDraw}
              disabled={isDrawing}
              aria-label={isDrawing ? "Loading draw" : "Start draw"}
              className="relative w-[200px] h-[200px] rounded-full select-none disabled:opacity-60 focus-visible:outline-none"
              style={{
                background: isDrawing
                  ? `linear-gradient(225deg, ${primaryColor} 0%, color-mix(in srgb, ${primaryColor} 60%, #fff) 100%)`
                  : `linear-gradient(135deg, ${primaryColor} 0%, color-mix(in srgb, ${primaryColor} 80%, #fff) 100%)`,
                boxShadow: isDrawing
                  ? `0 0 40px ${primaryColor}66, 0 8px 32px ${primaryColor}44`
                  : `0 8px 32px ${primaryColor}44`,
              }}
            >
              {/* Ring 1 — inset -10px, 2px solid, 25% opacity */}
              <motion.span
                aria-hidden
                className="absolute rounded-full pointer-events-none"
                style={{
                  inset: "-10px",
                  border: `2px solid ${primaryColor}40`,
                }}
                animate={{ scale: [1, 1.04, 1], opacity: [0.7, 0.3, 0.7] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0 }}
              />
              {/* Ring 2 — inset -22px, 1px solid, 12% opacity */}
              <motion.span
                aria-hidden
                className="absolute rounded-full pointer-events-none"
                style={{
                  inset: "-22px",
                  border: `1px solid ${primaryColor}1f`,
                }}
                animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.15, 0.5] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
              />
              {/* Ring 3 — inset -36px, 1px solid, 6% opacity */}
              <motion.span
                aria-hidden
                className="absolute rounded-full pointer-events-none"
                style={{
                  inset: "-36px",
                  border: `1px solid ${primaryColor}0f`,
                }}
                animate={{ scale: [1, 1.06, 1], opacity: [0.4, 0.1, 0.4] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
              />

              {/* Button text — Fraunces 32px, uppercase */}
              <span
                className="relative z-10 font-display font-bold uppercase select-none"
                style={{ fontSize: "32px", letterSpacing: "0.05em", color: colors.bg }}
              >
                {isDrawing ? "..." : "DRAW"}
              </span>
            </motion.button>
          )}

          {isResult && (
            <motion.div
              key="confirm-btns"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ delay: 0.2 }}
              className="flex gap-4 w-full"
            >
              {/* Two-step reject: first tap shows confirmation label, second tap fires */}
              <AnimatePresence mode="wait">
                {rejectPending ? (
                  <motion.button
                    key="reject-confirm"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={handleRejectConfirm}
                    className="flex-1 py-5 rounded-2xl font-bold text-base transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-500/40"
                    style={{
                      background: `${colors.danger}26`,
                      border: `1.5px solid ${colors.danger}66`,
                      color: colors.danger,
                    }}
                  >
                    Tap again to reject
                  </motion.button>
                ) : (
                  <motion.button
                    key="reject-first"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={handleRejectFirstTap}
                    className="flex-1 py-5 rounded-2xl font-bold text-xl transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-500/30"
                    style={{
                      background: "transparent",
                      border: `1.5px solid ${colors.danger}59`,
                      color: `${colors.danger}cc`,
                    }}
                  >
                    Reject
                  </motion.button>
                )}
              </AnimatePresence>
              {/* Two-step confirm: first tap shows confirmation state, second tap fires */}
              <AnimatePresence mode="wait">
                {confirmPending ? (
                  <motion.button
                    key="confirm-confirm"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={handleConfirmFinal}
                    className="flex-1 py-5 rounded-2xl font-bold text-base transition-all active:opacity-80 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-500/40"
                    style={{
                      background: `${colors.success}26`,
                      border: `1.5px solid ${colors.success}66`,
                      color: colors.success,
                    }}
                  >
                    Tap again to confirm
                  </motion.button>
                ) : (
                  <motion.button
                    key="confirm-first"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={handleConfirmFirstTap}
                    className="flex-1 py-5 rounded-2xl text-white font-bold text-xl transition-all active:opacity-80 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
                    style={{
                      background: `linear-gradient(135deg, ${colors.success} 0%, #4aad54 100%)`,
                      boxShadow: `0 4px 20px ${colors.success}59`,
                    }}
                  >
                    Confirm
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-center px-4 py-2 bg-red-500/10 rounded-xl"
            style={{ color: colors.danger }}
          >
            {error}
          </motion.p>
        )}
      </div>

      {/* Bottom safe area */}
      <div className="pb-8" />
    </div>
  )
}
