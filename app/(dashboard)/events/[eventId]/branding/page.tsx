"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useState, useEffect, use, useRef, useCallback } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { colors } from "@/lib/design-tokens"
import { NovaDraw } from "@/components/draw/NovaDraw"

// ─── Mock data for preview ───────────────────────────────────────────────────
const MOCK_PARTICIPANTS = [
  { _id: "p1", name: "Michael Chen", nameZh: "陳大文" as string | null },
  { _id: "p2", name: "Sarah Wong", nameZh: "黃思慧" },
  { _id: "p3", name: "David Liu", nameZh: "劉嘉欣" },
  { _id: "p4", name: "Jessica Tam", nameZh: "譚嘉欣" },
  { _id: "p5", name: "Kevin Ng", nameZh: "吳志強" },
  { _id: "p6", name: "Rachel Chan", nameZh: "陳美玲" },
  { _id: "p7", name: "Peter Lam", nameZh: "林志強" },
  { _id: "p8", name: "Alice Wong", nameZh: "王美玲" },
  { _id: "p9", name: "Tom Lee", nameZh: "李小明" },
  { _id: "p10", name: "Jenny Zhang", nameZh: "張偉健" },
]
const MOCK_WINNER = { _id: "p2", name: "Sarah Wong", nameZh: "黃思慧" as string | null }

// ─── Live preview with auto-cycling state machine ────────────────────────────
function LivePreview({ primaryColor }: { primaryColor: string }) {
  const [isSpinning, setIsSpinning] = useState(false)
  const [winner, setWinner] = useState<{ _id: string; name: string; nameZh: string | null } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const phaseRef = useRef<"idle" | "spinning" | "revealed">("idle")

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }, [])

  const startCycle = useCallback(() => {
    clearTimer()
    setIsSpinning(false)
    setWinner(null)
    phaseRef.current = "idle"

    timerRef.current = setTimeout(() => {
      setWinner(MOCK_WINNER)
      setIsSpinning(true)
      phaseRef.current = "spinning"
    }, 3000)
  }, [clearTimer])

  const handleComplete = useCallback(() => {
    phaseRef.current = "revealed"
    setIsSpinning(false)
    timerRef.current = setTimeout(() => {
      startCycle()
    }, 4000)
  }, [startCycle])

  useEffect(() => {
    startCycle()
    return clearTimer
  }, [startCycle, clearTimer])

  const phaseLabel = phaseRef.current === "idle" ? "idle" : phaseRef.current === "spinning" ? "drawing..." : "winner!"
  const phaseColor = phaseRef.current === "idle" ? "rgba(255,255,255,0.4)" : phaseRef.current === "spinning" ? primaryColor : colors.success

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden" style={{ background: colors.bg }}>
      {/* Phase indicators */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pointer-events-none">
        <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-md"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", color: "rgba(255,255,255,0.4)" }}>
          Live Preview
        </span>
        <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-md"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", color: phaseColor }}>
          {phaseLabel}
        </span>
      </div>

      {/* Nova draw animation */}
      <div className="w-full h-full flex items-center justify-center">
        <NovaDraw
          participants={MOCK_PARTICIPANTS}
          winner={winner}
          isSpinning={isSpinning}
          primaryColor={primaryColor}
          onComplete={handleComplete}
        />
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-5 py-3 pointer-events-none"
        style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.8))" }}>
        <div className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>
          Nova — Cinematic Draw
        </div>
        <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
          Particle explosion reveal with bloom, film grain &amp; ACES tone mapping
        </div>
      </div>
    </div>
  )
}

// ─── Main Branding Page ─────────────────────────────────────────────────────
export default function BrandingPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId: rawEventId } = use(params)
  const eventId = rawEventId as Id<"drawEvents">
  const event = useQuery(api.events.get, { eventId })

  const primaryColor = event?.primaryColor ?? colors.accent

  // Loading
  if (event === undefined) {
    return (
      <div className="-m-8 flex h-screen overflow-hidden" style={{ background: colors.bg }} aria-busy="true" aria-label="Loading branding settings">
        <div className="flex-1 animate-pulse" style={{ background: colors.surfaceRaised }} />
      </div>
    )
  }

  // Not found
  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <p style={{ color: colors.textMuted }}>Event not found</p>
        <Link href="/events" className="text-sm underline" style={{ color: colors.accent }}>Back to events</Link>
      </div>
    )
  }

  return (
    <div className="-m-4 md:-m-8 flex flex-col h-auto md:h-screen md:overflow-hidden" style={{ background: colors.bg }}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3 flex-shrink-0 border-b" style={{ borderColor: colors.border }}>
        <div className="flex items-center gap-4">
          <Link href={`/events/${eventId}`}
            className="flex items-center gap-1.5 text-sm transition-colors group" style={{ color: colors.textDim }}>
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="group-hover:text-[var(--accent)] transition-colors">{event.name}</span>
          </Link>
          <div className="w-px h-5" style={{ background: colors.border }} />
          <h1 className="font-display text-lg font-bold" style={{ color: colors.text }}>
            Draw Preview
          </h1>
        </div>
      </div>

      {/* Full preview */}
      <div className="flex-1 min-h-[400px]" style={{ background: colors.bg }}>
        <LivePreview primaryColor={primaryColor} />
      </div>
    </div>
  )
}
