"use client"

import { use, useState } from "react"
import { useQuery, useAction } from "convex/react"
import { useAuth } from "@clerk/nextjs"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import Link from "next/link"
import { ExternalLink, Download, Users, Trophy, Palette, CheckCircle2, Circle, ChevronRight, AlertCircle } from "lucide-react"
import { colors } from "@/lib/design-tokens"
import { EventTabNav } from "@/components/events/EventTabNav"

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  completed: "Completed",
  archived: "Archived",
}

function DetailSkeleton() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading event">
      {/* Back link skeleton */}
      <div className="h-4 w-16 rounded mb-6" style={{ background: colors.surface }} />
      {/* Title skeleton */}
      <div className="h-9 w-64 rounded mb-2" style={{ background: colors.surface }} />
      <div className="h-5 w-40 rounded mb-8" style={{ background: colors.surface }} />
      {/* Tab bar skeleton */}
      <div className="flex gap-6 border-b mb-8" style={{ borderColor: colors.border }}>
        {[80, 100, 60, 80].map((w, i) => (
          <div key={i} className="h-4 rounded mb-3" style={{ width: w, background: colors.surface }} />
        ))}
      </div>
      {/* Two-column skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="rounded-xl h-64" style={{ background: colors.surface, border: `1px solid ${colors.border}` }} />
        <div className="rounded-xl h-64" style={{ background: colors.surface, border: `1px solid ${colors.border}` }} />
      </div>
    </div>
  )
}

export default function EventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId: rawEventId } = use(params)
  const eventId = rawEventId as Id<"drawEvents">
  const event = useQuery(api.events.get, { eventId })
  const participants = useQuery(api.participants.list, { eventId })
  const tiers = useQuery(api.prizes.listTiers, { eventId })
  const winners = useQuery(api.winnerLogs.listConfirmed, { eventId })
  const createCheckout = useAction(api.events.createCheckoutSession)
  const { getToken } = useAuth()

  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  // H8: export with loading + error handling
  async function handleExportCSV() {
    if (isExporting) return
    setIsExporting(true)
    setExportError(null)
    try {
      const token = await getToken({ template: "convex" })
      const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.replace(".convex.cloud", ".convex.site")
      const res = await fetch(`${convexSiteUrl}/export/winners?eventId=${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`Export failed: ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${event?.name ?? "winners"}-winners.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setExportError("Export failed. Please try again.")
      setTimeout(() => setExportError(null), 5000)
    } finally {
      setIsExporting(false)
    }
  }

  // H7: checkout with loading + error handling
  async function handleCheckout() {
    if (isCheckingOut) return
    setIsCheckingOut(true)
    setCheckoutError(null)
    try {
      const url = await createCheckout({ eventId: event!._id })
      window.location.href = url
    } catch {
      setCheckoutError("Failed to start checkout. Please try again.")
      setTimeout(() => setCheckoutError(null), 5000)
      setIsCheckingOut(false)
    }
  }

  if (event === undefined) {
    return <DetailSkeleton />
  }

  if (event === null) {
    return (
      <div className="text-center py-24">
        <p className="text-lg mb-2" style={{ color: colors.textMuted }}>Event not found</p>
        <p className="text-sm mb-6" style={{ color: colors.textDim }}>
          This event may have been deleted or you may not have access.
        </p>
        <Link
          href="/events"
          className="btn-ghost inline-flex"
        >
          Back to Events
        </Link>
      </div>
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

  const hasParticipants = (participants?.length ?? 0) > 0
  const hasPrizes = (tiers?.length ?? 0) > 0 && tiers!.some(t => t.prizes.length > 0)
  const setupComplete = hasParticipants && hasPrizes
  const hasCompletedDraws = (winners?.length ?? 0) > 0
  const isCompleted = event.status === "completed"

  const setupSteps = [
    {
      key: "participants",
      label: "Add participants",
      sublabel: participants !== undefined ? `${participants.length} added` : "0 added",
      done: hasParticipants,
      href: `/events/${eventId}/participants`,
      icon: Users,
    },
    {
      key: "prizes",
      label: "Set up prize tiers",
      sublabel: tiers !== undefined
        ? `${tiers.length} tiers, ${tiers.reduce((a, t) => a + t.prizes.length, 0)} prizes`
        : "0 tiers",
      done: hasPrizes,
      href: `/events/${eventId}/prizes`,
      icon: Trophy,
    },
    {
      key: "preset",
      label: "Draw Preset",
      sublabel: "Animation theme",
      done: true, // Always optional
      href: `/events/${eventId}/branding`,
      icon: Palette,
    },
  ]

  // Status badge styles
  const statusStyle: Record<string, { bg: string; color: string }> = {
    draft: { bg: "rgba(226,168,75,0.12)", color: colors.accent },
    active: { bg: "rgba(94,194,105,0.12)", color: colors.success },
    completed: { bg: "rgba(91,141,239,0.12)", color: colors.blue },
    archived: { bg: colors.surface, color: colors.textDim },
  }
  const badge = statusStyle[event.status] ?? statusStyle.archived

  return (
    <div>
      {/* Back link */}
      <Link
        href="/events"
        className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors group"
        style={{ color: colors.textDim }}
      >
        <svg
          className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="transition-colors group-hover:text-accent" style={{ color: "inherit" }}>
          Events
        </span>
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1
            className="font-display text-3xl font-bold tracking-tight"
            style={{ color: colors.text }}
          >
            {event.name}
          </h1>
          {event.nameZh && (
            <p className="font-zh mt-1 text-lg" style={{ color: colors.textMuted }}>
              {event.nameZh}
            </p>
          )}
        </div>
        <span
          className="text-xs px-2.5 py-1 rounded-full mt-1 shrink-0 font-medium"
          style={{ background: badge.bg, color: badge.color }}
        >
          {STATUS_LABELS[event.status] ?? event.status}
        </span>
      </div>

      {/* Tab navigation */}
      <EventTabNav eventId={eventId} />

      {/* Two-column layout — M9: md breakpoint accounts for 220px sidebar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* LEFT column: Setup checklist */}
        <div className="order-2 md:order-1 space-y-5">

          {/* Setup checklist card */}
          <div className="card-glass overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <h2
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: colors.textDim }}
              >
                Setup
              </h2>
            </div>

            {setupSteps.map((step, i) => {
              const StepIcon = step.icon
              return (
                <Link
                  key={step.key}
                  href={step.href}
                  className="flex items-center gap-4 px-5 py-4 transition-colors group"
                  style={{
                    borderTop: i > 0 ? `1px solid ${colors.border}` : undefined,
                  }}
                >
                  {/* 38px icon container */}
                  <div
                    className="w-[38px] h-[38px] rounded-lg flex items-center justify-center shrink-0 transition-colors"
                    style={{ background: colors.accentSubtle }}
                  >
                    <StepIcon
                      className="w-4 h-4"
                      style={{ color: colors.accent }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-medium transition-colors group-hover:text-text-base"
                      style={{ color: colors.text }}
                    >
                      {step.label}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: colors.textDim }}>
                      {step.sublabel}
                    </div>
                  </div>

                  {/* Status indicator */}
                  <div className="shrink-0 flex items-center gap-2">
                    {step.done && step.key !== "appearance" ? (
                      <CheckCircle2 className="w-4 h-4" style={{ color: colors.success }} />
                    ) : (
                      <Circle className="w-4 h-4" style={{ color: colors.textDim }} />
                    )}
                    <ChevronRight
                      className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                      style={{ color: colors.textDim }}
                    />
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Results / Export */}
          <div className="card-glass p-5">
            <h2
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: colors.textDim }}
            >
              Results
            </h2>
            {/* H8: export error */}
            {exportError && (
              <p className="text-xs mb-2 flex items-center gap-1.5" style={{ color: colors.danger }}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {exportError}
              </p>
            )}
            {hasCompletedDraws ? (
              <button
                onClick={handleExportCSV}
                disabled={isExporting}
                aria-busy={isExporting}
                className="flex items-center justify-between w-full p-4 rounded-lg transition-colors text-left group disabled:opacity-60"
                style={{ background: colors.surface }}
                onMouseEnter={e => !isExporting && (e.currentTarget.style.background = colors.surfaceHover)}
                onMouseLeave={e => (e.currentTarget.style.background = colors.surface)}
              >
                <span style={{ color: colors.textMuted }} className="text-sm">
                  {isExporting ? "Exporting..." : "Export Winners (CSV)"}
                </span>
                <Download className="w-4 h-4 transition-colors" style={{ color: colors.textDim }} />
              </button>
            ) : (
              <div
                className="flex items-center justify-between w-full p-4 rounded-lg"
                style={{ background: colors.surface }}
              >
                <span className="text-sm" style={{ color: colors.textDim }}>
                  Run the draw first to export results
                </span>
                <Download className="w-4 h-4 opacity-30" style={{ color: colors.textDim }} aria-hidden="true" />
              </div>
            )}
          </div>

          {/* Stripe licensing */}
          {event.status === "draft" && (
            <div className="card-glass p-5">
              <p className="text-sm mb-3" style={{ color: colors.textDim }}>
                Activate a production license to use this event at a paid venue.
              </p>
              {/* H7: checkout error */}
              {checkoutError && (
                <p className="text-xs mb-2 flex items-center gap-1.5" style={{ color: colors.danger }}>
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {checkoutError}
                </p>
              )}
              <button
                onClick={handleCheckout}
                disabled={isCheckingOut}
                aria-busy={isCheckingOut}
                className="btn-ghost w-full disabled:opacity-60"
              >
                {isCheckingOut ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin inline-block"
                      style={{ borderColor: `${colors.accent} transparent ${colors.accent} ${colors.accent}` }} />
                    Processing...
                  </span>
                ) : "Purchase Event License — HKD $2,000"}
              </button>
            </div>
          )}
        </div>

        {/* RIGHT column: Draw Stage CTA */}
        <div className="order-1 md:order-2">
          {isCompleted ? (
            /* Completed state */
            <div
              className="rounded-xl overflow-hidden p-6"
              style={{
                border: `1px solid ${event.primaryColor}44`,
                background: `${event.primaryColor}0d`,
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-5 h-5" style={{ color: event.primaryColor }} />
                <h2
                  className="font-display text-lg font-semibold"
                  style={{ color: colors.text }}
                >
                  Draw Complete
                </h2>
              </div>
              <p className="text-sm mb-5" style={{ color: colors.textMuted }}>
                {winners !== undefined
                  ? `${winners.length} winner${winners.length !== 1 ? "s" : ""} confirmed across all prize tiers.`
                  : "All draws have been completed."}
              </p>
              {/* H8: disabled + loading state on completed-state export button */}
              <button
                onClick={handleExportCSV}
                disabled={isExporting}
                aria-busy={isExporting}
                className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-lg font-semibold transition hover:opacity-90 active:opacity-80 disabled:opacity-60"
                style={{
                  background: event.primaryColor,
                  color: colors.bg,
                }}
              >
                <Download className="w-4 h-4" />
                {isExporting ? "Exporting..." : "Export Winners (CSV)"}
              </button>
            </div>
          ) : (
            /* Active / draft state */
            <div
              className="rounded-xl overflow-hidden"
              style={{
                border: `1px solid ${setupComplete ? `${event.primaryColor}44` : colors.border}`,
                background: setupComplete ? `${event.primaryColor}0d` : colors.surface,
              }}
            >
              <div className="p-6">
                <h2
                  className="font-display text-xl font-semibold mb-1"
                  style={{ color: colors.text }}
                >
                  Draw Stage
                </h2>
                <p className="text-sm mb-5" style={{ color: colors.textMuted }}>
                  {setupComplete
                    ? "Everything is set up. Open the stage on a big screen and use your phone as a remote control."
                    : "Complete the setup checklist before starting the draw."}
                </p>

                <div
                  className="flex flex-col gap-3"
                  style={!setupComplete ? { opacity: 0.45, pointerEvents: "none" } : undefined}
                >
                  {/* Primary CTA */}
                  <a
                    href={`${appUrl}/draw/${event._id}/stage`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-semibold transition hover:brightness-110 active:scale-[0.98]"
                    style={{
                      background: `linear-gradient(135deg, ${colors.accent} 0%, #f5c97a 100%)`,
                      color: colors.bg,
                      boxShadow: `0 4px 20px ${colors.accentGlow}`,
                    }}
                    aria-disabled={!setupComplete}
                    onClick={e => !setupComplete && e.preventDefault()}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Stage
                  </a>

                  {/* Secondary row */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <a
                      href={`${appUrl}/draw/${event._id}/remote`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost flex-1 flex items-center justify-center gap-2"
                      aria-disabled={!setupComplete}
                      onClick={e => !setupComplete && e.preventDefault()}
                    >
                      Remote Controller
                    </a>
                    <a
                      href={`${appUrl}/draw/${event._id}/audience`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost flex-1 flex items-center justify-center gap-2"
                      aria-disabled={!setupComplete}
                      onClick={e => !setupComplete && e.preventDefault()}
                    >
                      Audience Screen
                    </a>
                  </div>
                </div>

                {setupComplete ? (
                  <p className="text-xs italic mt-4" style={{ color: colors.textDim }}>
                    Tip: Open Stage on a large display, scan the QR code with your phone, then use your phone as the remote.
                  </p>
                ) : (
                  <p className="text-xs italic mt-4" style={{ color: colors.textDim }}>
                    Add participants and set up prize tiers on the left to unlock the draw.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
