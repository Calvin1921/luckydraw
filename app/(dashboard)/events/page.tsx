"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { useAuth } from "@clerk/nextjs"
import { api } from "@/convex/_generated/api"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  PlusIcon,
  Users,
  Trophy,
  CalendarDays,
  Search,
  ExternalLink,
  Settings,
  SlidersHorizontal,
} from "lucide-react"
import { colors, staggerStyle } from "@/lib/design-tokens"

// ─── Constants ───────────────────────────────────────────────────────────────

const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true"

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  completed: "Completed",
  archived: "Archived",
}

// Status badge colors — inline styles, not Tailwind, to use exact token values
const STATUS_STYLES: Record<string, { bg: string; color: string; bar: string }> = {
  draft: {
    bg: "rgba(212,168,83,0.12)",
    color: colors.warning,
    bar: colors.warning,
  },
  active: {
    bg: "rgba(94,194,105,0.12)",
    color: colors.success,
    bar: colors.success,
  },
  completed: {
    bg: "rgba(91,141,239,0.12)",
    color: colors.blue,
    bar: colors.blue,
  },
  archived: {
    bg: colors.surface,
    color: colors.textDim,
    bar: colors.textDim,
  },
}

type FilterStatus = "all" | "draft" | "active" | "completed"

// ─── Skeleton ────────────────────────────────────────────────────────────────

function EventCardSkeleton({ index }: { index: number }) {
  return (
    <div
      className="card-glass rounded-xl overflow-hidden animate-pulse"
      style={staggerStyle(index)}
    >
      {/* accent bar */}
      <div className="h-[3px] bg-white/10" />
      <div className="p-5 space-y-3">
        <div className="h-5 w-3/5 rounded bg-white/10" />
        <div className="h-3.5 w-2/5 rounded bg-white/[0.07]" />
        <div className="flex gap-4 pt-1">
          <div className="h-3 w-16 rounded bg-white/[0.06]" />
          <div className="h-3 w-16 rounded bg-white/[0.06]" />
          <div className="h-3 w-20 rounded bg-white/[0.06]" />
        </div>
        <div className="h-1 w-full rounded-full bg-white/[0.05] mt-2" />
      </div>
    </div>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center relative">
      {/* Orbiting particles */}
      <div className="relative w-32 h-32 mb-8" aria-hidden="true">
        {/* Center glow */}
        <div
          className="absolute inset-0 rounded-full animate-pulse-gold"
          style={{
            background: `radial-gradient(circle, ${colors.accentGlow} 0%, transparent 70%)`,
          }}
        />
        <div
          className="absolute inset-6 rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(226,168,75,0.15) 0%, transparent 70%)`,
            boxShadow: `0 0 24px ${colors.accentGlow}`,
          }}
        />
        {/* Orbit ring */}
        <div
          className="absolute inset-2 rounded-full border"
          style={{ borderColor: "rgba(226,168,75,0.15)" }}
        />
        {/* Orbiting particles — CSS animation via custom keyframes */}
        {[0, 60, 120, 180, 240, 300].map((deg, i) => (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              background: i % 2 === 0 ? colors.accent : colors.accentGlow,
              top: "50%",
              left: "50%",
              transformOrigin: "0 0",
              animation: `orbit ${3 + i * 0.3}s linear infinite`,
              animationDelay: `${-i * 0.5}s`,
              transform: `rotate(${deg}deg) translateX(52px) translateY(-3px)`,
            }}
          />
        ))}
      </div>

      <h2 className="font-display text-2xl font-semibold mb-3" style={{ color: colors.text }}>
        Create your first lucky draw
      </h2>
      <p className="text-sm max-w-xs mb-8" style={{ color: colors.textMuted }}>
        Set up an event, add participants and prizes, then run a professional draw on stage.
      </p>
      <Link href="/events/new" className="btn-accent">
        <PlusIcon className="w-4 h-4" />
        New Event
      </Link>

      <style>{`
        @keyframes orbit {
          from { transform: rotate(var(--start-deg, 0deg)) translateX(52px) translateY(-3px); }
          to   { transform: rotate(calc(var(--start-deg, 0deg) + 360deg)) translateX(52px) translateY(-3px); }
        }
      `}</style>
    </div>
  )
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
        style={{ background: "rgba(212,85,85,0.12)" }}
      >
        <span className="text-xl" role="img" aria-label="Error">⚠</span>
      </div>
      <p className="text-base mb-1" style={{ color: colors.textMuted }}>
        Something went wrong loading your events.
      </p>
      <p className="text-sm mb-6" style={{ color: colors.textDim }}>
        Try refreshing the page.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="btn-ghost text-sm"
      >
        Retry
      </button>
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: number | string
  index: number
}

function StatCard({ label, value, index }: StatCardProps) {
  return (
    <div
      className="card-glass rounded-xl p-4 stagger-item"
      style={staggerStyle(index)}
    >
      <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: colors.textDim }}>
        {label}
      </p>
      <p className="text-2xl font-display font-semibold" style={{ color: colors.text }}>
        {value}
      </p>
    </div>
  )
}

// ─── Event card ───────────────────────────────────────────────────────────────

interface EventCardProps {
  event: {
    _id: string
    name: string
    nameZh?: string
    status: string
    eventDate?: number
    participantCount: number
    tierCount: number
    primaryColor: string
  }
  index: number
}

function EventCard({ event, index }: EventCardProps) {
  const statusStyle = STATUS_STYLES[event.status] ?? STATUS_STYLES.archived
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

  // Setup progress: participants + tiers are the two measurable steps from the list query
  // We don't have hasPrizes here (only tierCount), so we score 0–2 steps
  const setupScore = Math.min(
    (event.participantCount > 0 ? 1 : 0) + (event.tierCount > 0 ? 1 : 0),
    2
  )
  const setupProgress = setupScore / 2 // 0, 0.5, or 1

  const formattedDate = event.eventDate
    ? new Date(event.eventDate).toLocaleDateString("en-HK", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null

  return (
    <div
      className="card-glass rounded-xl overflow-hidden stagger-item group"
      style={staggerStyle(index)}
    >
      {/* 3px colored accent bar */}
      <div className="h-[3px]" style={{ background: statusStyle.bar }} />

      <div className="p-5">
        {/* Header row: name + badge */}
        <div className="flex items-start justify-between gap-3 mb-1">
          <Link
            href={`/events/${event._id}`}
            className="flex-1 min-w-0"
            aria-label={`Open event: ${event.name}`}
          >
            <h2
              className="font-display text-lg font-semibold leading-snug truncate hover:opacity-80 transition-opacity"
              style={{ color: colors.text }}
            >
              {event.name}
            </h2>
          </Link>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5"
            style={{ background: statusStyle.bg, color: statusStyle.color }}
          >
            {STATUS_LABELS[event.status] ?? event.status}
          </span>
        </div>

        {/* Chinese name */}
        {event.nameZh && (
          <p
            className="font-zh text-sm mb-3 truncate"
            style={{ color: colors.textMuted }}
          >
            {event.nameZh}
          </p>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 mb-4">
          <span className="flex items-center gap-1 text-xs" style={{ color: colors.textDim }}>
            <Users className="w-3 h-3" aria-hidden="true" />
            {event.participantCount} participants
          </span>
          <span className="flex items-center gap-1 text-xs" style={{ color: colors.textDim }}>
            <Trophy className="w-3 h-3" aria-hidden="true" />
            {event.tierCount} {event.tierCount === 1 ? "tier" : "tiers"}
          </span>
          {formattedDate && (
            <span className="flex items-center gap-1 text-xs" style={{ color: colors.textDim }}>
              <CalendarDays className="w-3 h-3" aria-hidden="true" />
              {formattedDate}
            </span>
          )}
        </div>

        {/* Setup progress bar */}
        <div className="mb-3">
          <div
            className="h-[4px] w-full rounded-full overflow-hidden"
            style={{ background: colors.surface }}
            role="progressbar"
            aria-valuenow={Math.round(setupProgress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Setup progress"
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${setupProgress * 100}%`,
                background:
                  setupProgress === 1
                    ? colors.success
                    : setupProgress > 0
                    ? colors.warning
                    : colors.textDim,
              }}
            />
          </div>
        </div>

        {/* Quick-actions — in normal flow below progress bar */}
        <div
          className="flex gap-2 opacity-60 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200"
        >
        <a
          href={`${appUrl}/draw/${event._id}/stage`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 flex-1 justify-center py-2 rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
          style={{
            background: colors.accentSubtle,
            color: colors.accent,
            border: `1px solid rgba(226,168,75,0.2)`,
            // @ts-ignore — CSS custom property for focus ring color
            "--tw-ring-color": colors.accent,
            "--tw-ring-offset-color": colors.bgWarm,
          } as React.CSSProperties}
          aria-label={`Open stage for ${event.name}`}
          onClick={e => e.stopPropagation()}
        >
          <ExternalLink className="w-3 h-3" aria-hidden="true" />
          Stage
        </a>
        <a
          href={`${appUrl}/draw/${event._id}/remote`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 flex-1 justify-center py-2 rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
          style={{
            background: colors.surface,
            color: colors.textMuted,
            border: `1px solid ${colors.border}`,
            "--tw-ring-color": colors.accent,
            "--tw-ring-offset-color": colors.bgWarm,
          } as React.CSSProperties}
          aria-label={`Open remote for ${event.name}`}
          onClick={e => e.stopPropagation()}
        >
          <SlidersHorizontal className="w-3 h-3" aria-hidden="true" />
          Remote
        </a>
        <Link
          href={`/events/${event._id}`}
          className="flex items-center gap-1.5 flex-1 justify-center py-2 rounded-lg text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
          style={{
            background: colors.surface,
            color: colors.textMuted,
            border: `1px solid ${colors.border}`,
            "--tw-ring-color": colors.accent,
            "--tw-ring-offset-color": colors.bgWarm,
          } as React.CSSProperties}
          aria-label={`Edit ${event.name}`}
          onClick={e => e.stopPropagation()}
        >
          <Settings className="w-3 h-3" aria-hidden="true" />
          Edit
        </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Create event card ────────────────────────────────────────────────────────

function CreateEventCard({ index }: { index: number }) {
  return (
    <Link
      href="/events/new"
      className="rounded-xl overflow-hidden stagger-item flex flex-row items-center gap-3 p-5 group transition-all duration-200 hover:opacity-80"
      style={
        {
          ...staggerStyle(index),
          border: `1.5px dashed rgba(226,168,75,0.25)`,
          background: colors.accentSubtle,
        } as React.CSSProperties
      }
      aria-label="Create a new event"
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
        style={{
          background: "rgba(226,168,75,0.1)",
          border: `1px solid rgba(226,168,75,0.2)`,
        }}
      >
        <PlusIcon
          className="w-4 h-4"
          style={{ color: "rgba(226,168,75,0.6)" }}
          aria-hidden="true"
        />
      </div>
      <span
        className="text-sm font-medium"
        style={{ color: "rgba(226,168,75,0.6)" }}
      >
        New Event
      </span>
    </Link>
  )
}

// ─── Filter chip ──────────────────────────────────────────────────────────────

interface FilterChipProps {
  label: string
  count?: number
  active: boolean
  onClick: () => void
}

function FilterChip({ label, count, active, onClick }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150"
      style={
        active
          ? {
              background: colors.accentSubtle,
              color: colors.accent,
              border: `1px solid rgba(226,168,75,0.3)`,
            }
          : {
              background: "transparent",
              color: colors.textMuted,
              border: `1px solid ${colors.border}`,
            }
      }
      aria-pressed={active}
    >
      {label}
      {count !== undefined && (
        <span
          className="text-xs px-1.5 py-0.5 rounded-full"
          style={{
            background: active ? "rgba(226,168,75,0.15)" : colors.surface,
            color: active ? colors.accent : colors.textDim,
          }}
        >
          {count}
        </span>
      )}
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EventsPage() {
  const { userId, orgId } = useAuth()
  const identifier = DEV_BYPASS
    ? "dev_bypass_org"
    : orgId ?? (userId ? `user_${userId}` : null)

  const org = useQuery(
    api.organizations.getByClerkOrgId,
    identifier ? { clerkOrgId: identifier } : "skip"
  )
  const events = useQuery(api.events.list, org ? { orgId: org._id } : "skip")

  const isLoading = !org || events === undefined

  // ── Local filter state ────────────────────────────────────────────────────
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("all")
  const [searchQuery, setSearchQuery] = useState("")

  // ── Derived stats ─────────────────────────────────────────────────────────
  const allEvents = events ?? []
  const totalEvents = allEvents.length
  const activeCount = allEvents.filter(e => e.status === "active").length
  const draftCount = allEvents.filter(e => e.status === "draft").length
  const completedCount = allEvents.filter(e => e.status === "completed").length
  const totalParticipants = allEvents.reduce((sum, e) => sum + e.participantCount, 0)
  // "Prizes awarded" = completed events (proxy — winner count unavailable in list query)
  const prizesAwarded = completedCount

  // ── Filtered + searched events ────────────────────────────────────────────
  const filteredEvents = allEvents
    .filter(e => activeFilter === "all" || e.status === activeFilter)
    .filter(e => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        e.name.toLowerCase().includes(q) ||
        (e.nameZh ?? "").toLowerCase().includes(q)
      )
    })

  // ─────────────────────────────────────────────────────────────────────────
  // Loading state
  // ─────────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div aria-busy="true" aria-label="Loading events">
        {/* Header skeleton */}
        <div className="flex items-start justify-between mb-8">
          <div className="space-y-2">
            <div className="h-9 w-36 rounded-lg bg-white/10 animate-pulse" />
            <div className="h-4 w-52 rounded bg-white/[0.06] animate-pulse" />
          </div>
          <div className="h-10 w-32 rounded-lg bg-white/10 animate-pulse" />
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="card-glass rounded-xl p-4 animate-pulse">
              <div className="h-3 w-20 rounded bg-white/10 mb-2" />
              <div className="h-7 w-10 rounded bg-white/[0.07]" />
            </div>
          ))}
        </div>
        {/* Grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => (
            <EventCardSkeleton key={i} index={i} />
          ))}
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Error state (events returned null, which doesn't happen with Convex list
  // but we keep the guard for type safety / future resilience)
  // ─────────────────────────────────────────────────────────────────────────
  if (events === null) {
    return <ErrorState />
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Loaded
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex items-start justify-between gap-4 mb-8"
      >
        <div>
          <h1
            className="font-display text-4xl font-semibold italic"
            style={{ color: colors.text }}
          >
            Events
          </h1>
          <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
            Manage your lucky draw events and run live draws.
          </p>
        </div>
        <Link href="/events/new" className="btn-accent shrink-0">
          <PlusIcon className="w-4 h-4" aria-hidden="true" />
          New Event
        </Link>
      </motion.div>

      {/* ── Stats row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard label="Total Events" value={totalEvents} index={0} />
        <StatCard label="Active" value={activeCount} index={1} />
        <StatCard label="Participants" value={totalParticipants} index={2} />
        <StatCard label="Completed" value={prizesAwarded} index={3} />
      </div>

      {/* ── Filter bar ───────────────────────────────────────────────────── */}
      {totalEvents > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div className="flex flex-wrap gap-2 flex-1">
            <FilterChip
              label="All"
              count={totalEvents}
              active={activeFilter === "all"}
              onClick={() => setActiveFilter("all")}
            />
            {draftCount > 0 && (
              <FilterChip
                label="Draft"
                count={draftCount}
                active={activeFilter === "draft"}
                onClick={() => setActiveFilter("draft")}
              />
            )}
            {activeCount > 0 && (
              <FilterChip
                label="Active"
                count={activeCount}
                active={activeFilter === "active"}
                onClick={() => setActiveFilter("active")}
              />
            )}
            {completedCount > 0 && (
              <FilterChip
                label="Completed"
                count={completedCount}
                active={activeFilter === "completed"}
                onClick={() => setActiveFilter("completed")}
              />
            )}
          </div>
          {/* Search input */}
          <div
            className="relative flex items-center"
            style={{ minWidth: "200px" }}
          >
            <Search
              className="absolute left-3 w-3.5 h-3.5 pointer-events-none"
              style={{ color: colors.textDim }}
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search events…"
              className="w-full pl-8 pr-3 py-1.5 rounded-full text-sm transition-colors"
              style={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                color: colors.text,
                outline: "none",
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = colors.accent
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = colors.border
              }}
              aria-label="Search events"
            />
          </div>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {totalEvents === 0 && <EmptyState />}

      {/* ── No results after filter ───────────────────────────────────────── */}
      {totalEvents > 0 && filteredEvents.length === 0 && (
        <div
          className="text-center py-16 text-sm"
          style={{ color: colors.textMuted }}
        >
          No events match your filter.{" "}
          <button
            className="underline"
            style={{ color: colors.accent }}
            onClick={() => {
              setActiveFilter("all")
              setSearchQuery("")
            }}
          >
            Clear filters
          </button>
        </div>
      )}

      {/* ── Events grid ───────────────────────────────────────────────────── */}
      {filteredEvents.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredEvents.map((event, i) => (
            <EventCard key={event._id} event={event} index={i} />
          ))}
          {/* Create new event card — only shown in "all" view with no search */}
          {activeFilter === "all" && !searchQuery && (
            <CreateEventCard index={filteredEvents.length} />
          )}
        </div>
      )}
    </div>
  )
}
