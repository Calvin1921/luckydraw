"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { DrawEngine } from "@/components/draw/DrawEngine"

import QRCode from "react-qr-code"
import { use, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import Link from "next/link"

export default function StagePage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId: rawEventId } = use(params)

  // Guard against non-Convex-format IDs before they reach Convex validators
  let eventId: Id<"drawEvents"> | null = null
  try {
    // Convex IDs are non-empty strings — any string that reaches the query will be
    // validated server-side; we just need to avoid crashing the render.
    if (rawEventId && rawEventId.length > 0) {
      eventId = rawEventId as Id<"drawEvents">
    }
  } catch {
    eventId = null
  }

  const event = useQuery(api.events.get, eventId ? { eventId } : "skip")
  const session = useQuery(api.draw.getActiveSession, eventId ? { eventId } : "skip")
  const tiers = useQuery(api.prizes.listTiers, eventId ? { eventId } : "skip")
  const participants = useQuery(api.participants.list, eventId ? { eventId } : "skip")
  const markCompleted = useMutation(api.events.markCompleted)
  // H12/M19: Guard against repeated markCompleted calls on every subscription update
  const didCompleteRef = useRef(false)

  const allPrizesAwarded =
    tiers !== undefined &&
    tiers !== null &&
    tiers.length > 0 &&
    tiers.every(t => t.prizes.every((p: { isAwarded: boolean }) => p.isAwarded))

  // Mark event completed once when all prizes are awarded — never re-fires
  useEffect(() => {
    if (allPrizesAwarded && eventId && !didCompleteRef.current) {
      didCompleteRef.current = true
      markCompleted({ eventId }).catch(() => {
        // Best-effort — don't surface to the stage screen
      })
    }
  }, [allPrizesAwarded, eventId, markCompleted])

  // M21: Warn before leaving during an active draw session
  useEffect(() => {
    if (!session) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // Modern browsers require returnValue to be set
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [session])

  // Invalid event ID in URL
  if (!eventId) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center gap-4">
        <p className="text-white/60 text-lg">Event not found.</p>
        <Link href="/events" className="text-white/40 underline text-sm hover:text-white/70 transition-colors">
          Back to Events
        </Link>
      </div>
    )
  }

  // Loading — any query still pending
  if (event === undefined || participants === undefined || tiers === undefined || session === undefined) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div
          className="w-14 h-14 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: "rgba(255,255,255,0.25) transparent rgba(255,255,255,0.25) rgba(255,255,255,0.25)" }}
          role="status"
          aria-label="Loading"
        />
      </div>
    )
  }

  // Event not found (loaded but null — invalid ID that passed client check)
  if (!event) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center gap-4">
        <p className="text-white/60 text-lg">Event not found.</p>
        <Link href="/events" className="text-white/40 underline text-sm hover:text-white/70 transition-colors">
          Back to Events
        </Link>
      </div>
    )
  }

  // All prizes awarded — celebratory end screen
  if (allPrizesAwarded) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center gap-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="text-7xl"
        >
          🎉
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="font-display text-white font-bold text-4xl text-center"
        >
          All prizes awarded!
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="font-display italic text-white/40 text-xl"
        >
          {event.name}
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Link
            href={`/events/${eventId}`}
            className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            Back to Dashboard
          </Link>
        </motion.div>
      </div>
    )
  }

  // No session — session creation is the remote's job
  if (!session) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin border-white/20" />
        <p className="text-white/30 text-sm">Waiting for operator to start draw...</p>
        <p className="text-white/45 text-xs mt-2">{event.name}</p>
      </div>
    )
  }

  const primaryColor = event.primaryColor
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  // Remote URL is now per-event (not per-session), so it persists across tier advances
  const remoteUrl = `${appUrl}/draw/${eventId}/remote`

  // Compute tier progress
  const tierProgress = tiers.map(t => ({
    name: t.nameZh ?? t.name,
    total: t.prizes.length,
    awarded: t.prizes.filter((p: { isAwarded: boolean }) => p.isAwarded).length,
    isCurrent: t._id === session.tierId,
  }))
  const showStageChrome = session.status !== "result"

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Subtle event name — top left, Fraunces italic */}
      {showStageChrome && (
        <motion.div
          className="absolute top-5 left-6 z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          <p className="font-display italic text-white/20 text-sm">{event.name}</p>
        </motion.div>
      )}

      {/* Tier progress — top center */}
      {showStageChrome && tiers.length > 1 && (
        <motion.div
          className="absolute top-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35 }}
        >
          {tierProgress.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1">
                <div
                  className="h-1 rounded-full transition-all duration-500"
                  style={{
                    width: 32,
                    background: t.isCurrent
                      ? primaryColor
                      : t.awarded === t.total && t.total > 0
                        ? `${primaryColor}66`
                        : "rgba(255,255,255,0.15)",
                  }}
                />
                {t.isCurrent && (
                  <motion.div
                    layoutId="tier-label"
                    className="font-display text-[10px] text-white/50 whitespace-nowrap max-w-[64px] truncate text-center tracking-[0.12em] uppercase"
                  >
                    {t.name}
                  </motion.div>
                )}
              </div>
              {i < tierProgress.length - 1 && (
                <div className="w-3 h-px bg-white/10" />
              )}
            </div>
          ))}
        </motion.div>
      )}

      {/* Main draw engine */}
      <DrawEngine
        sessionId={session._id}
        participants={participants}
        primaryColor={primaryColor}
        isOperator={false}
        isStage={true}
      />

      {/* Remote QR code — bottom right */}
      {showStageChrome && (
        <div className="absolute bottom-6 right-6 z-30">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white p-3 rounded-2xl"
            style={{
              boxShadow:
                "0 4px 24px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.12) inset",
            }}
          >
            <QRCode value={remoteUrl} size={88} />
            <p className="text-black text-xs text-center mt-1.5 font-semibold tracking-tight">
              Remote
            </p>
          </motion.div>
        </div>
      )}
    </div>
  )
}
