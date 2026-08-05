"use client"

import { use } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { DrawEngine } from "@/components/draw/DrawEngine"

import { motion } from "framer-motion"
import Link from "next/link"

export default function AudiencePage({ params }: { params: Promise<{ eventId: string }> }) {
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

  const event = useQuery(api.events.get, eventId ? { eventId } : "skip")
  const session = useQuery(api.draw.getActiveSession, eventId ? { eventId } : "skip")
  const participants = useQuery(api.participants.listForDraw, eventId ? { eventId } : "skip")
  const tiers = useQuery(api.prizes.listTiers, eventId ? { eventId } : "skip")

  // Invalid ID in URL
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

  // Loading
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

  // Event not found after loading
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

  const allPrizesAwarded =
    tiers.length > 0 && tiers.every(t => t.prizes.every((p: { isAwarded: boolean }) => p.isAwarded))

  // All prizes awarded — mirror the stage's celebratory end screen
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
          className="text-white/40 text-xl"
        >
          {event.name}
        </motion.p>
      </div>
    )
  }

  // No active session — waiting for the draw to begin
  if (!session) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="text-white/60 text-4xl font-black tracking-tight">{event.name}</div>
        <div className="text-white/60 text-lg">Awaiting draw...</div>
      </div>
    )
  }

  return (
    <DrawEngine
      sessionId={session._id}
      participants={participants}
      primaryColor={event.primaryColor}
      isOperator={false}
      isStage={true}
    />
  )
}
