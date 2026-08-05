"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id, Doc } from "@/convex/_generated/dataModel"
import { useState, use, useEffect, useRef } from "react"
import { Gift } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { colors, staggerStyle } from "@/lib/design-tokens"
import { EventTabNav } from "@/components/events/EventTabNav"

export default function PrizesPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId: rawEventId } = use(params)
  const eventId = rawEventId as Id<"drawEvents">

  const event = useQuery(api.events.get, { eventId })
  const tiers = useQuery(api.prizes.listTiers, { eventId })
  const createTier = useMutation(api.prizes.createTier)
  const addPrize = useMutation(api.prizes.addPrize)
  const removePrize = useMutation(api.prizes.removePrize)
  const removeTier = useMutation(api.prizes.removeTier)
  const reorderTier = useMutation(api.prizes.reorderTier)

  const [newTierName, setNewTierName] = useState("")
  const [newPrizeInputs, setNewPrizeInputs] = useState<Record<string, string>>({})
  const [addTierError, setAddTierError] = useState<string | null>(null)
  const [addPrizeErrors, setAddPrizeErrors] = useState<Record<string, string>>({})
  const [removingPrizeId, setRemovingPrizeId] = useState<Id<"prizes"> | null>(null)
  const [removePrizeError, setRemovePrizeError] = useState<string | null>(null)
  // Track which tier is pending deletion (two-step confirmation)
  const [pendingDeleteTierId, setPendingDeleteTierId] = useState<Id<"prizeTiers"> | null>(null)
  const cancelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-cancel tier delete confirmation after 3 seconds
  useEffect(() => {
    if (pendingDeleteTierId) {
      cancelTimerRef.current = setTimeout(() => {
        setPendingDeleteTierId(null)
      }, 3000)
    }
    return () => {
      if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current)
    }
  }, [pendingDeleteTierId])

  function handleTierDeleteClick(tierId: Id<"prizeTiers">) {
    if (pendingDeleteTierId === tierId) {
      // Second click — confirm deletion
      if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current)
      setPendingDeleteTierId(null)
      removeTier({ tierId })
    } else {
      // First click — enter confirmation state, cancel any other pending
      if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current)
      setPendingDeleteTierId(tierId)
    }
  }

  // Loading state — skeleton tier cards
  if (tiers === undefined) {
    return (
      <div aria-busy="true" aria-label="Loading prize rounds">
        <div className="h-4 w-24 rounded animate-pulse mb-6" style={{ background: colors.surface }} />
        <div className="h-8 w-40 rounded animate-pulse mb-2" style={{ background: colors.surface }} />
        <div className="h-4 w-72 rounded animate-pulse mb-6" style={{ background: colors.surface }} />
        <div className="space-y-4">
          <div className="h-32 rounded-xl animate-pulse" style={{ background: colors.surface }} />
          <div className="h-32 rounded-xl animate-pulse" style={{ background: colors.surface }} />
        </div>
      </div>
    )
  }

  // H5: Error state — tiers returned null
  if (tiers === null) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: "rgba(212,85,85,0.1)" }}
        >
          <Gift className="w-6 h-6" style={{ color: colors.danger }} />
        </div>
        <div className="text-center">
          <p className="font-medium" style={{ color: colors.text }}>
            Failed to load prize rounds
          </p>
          <p className="text-sm mt-1" style={{ color: colors.textDim }}>
            Something went wrong. Try refreshing the page.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="btn-ghost"
        >
          Refresh
        </button>
      </div>
    )
  }

  const primaryColor = event?.primaryColor ?? colors.accent

  // H3: Add tier — try/catch with inline error
  async function handleAddTier(e: React.FormEvent) {
    e.preventDefault()
    if (!newTierName.trim()) return
    setAddTierError(null)
    try {
      await createTier({ eventId, name: newTierName.trim(), drawOrder: tiers!.length + 1 })
      setNewTierName("")
    } catch {
      setAddTierError("Failed to add round. Please try again.")
      setTimeout(() => setAddTierError(null), 4000)
    }
  }

  // H3: Add prize — try/catch with inline error per tier
  async function handleAddPrize(tierId: Id<"prizeTiers">) {
    const name = newPrizeInputs[tierId]?.trim()
    if (!name) return
    setAddPrizeErrors(prev => ({ ...prev, [tierId]: "" }))
    try {
      await addPrize({ tierId, eventId, name })
      setNewPrizeInputs(prev => ({ ...prev, [tierId]: "" }))
    } catch {
      setAddPrizeErrors(prev => ({ ...prev, [tierId]: "Failed to add prize. Try again." }))
      setTimeout(() => setAddPrizeErrors(prev => ({ ...prev, [tierId]: "" })), 4000)
    }
  }

  // H2: Remove prize — async, try/catch, loading state
  async function handleRemovePrize(prizeId: Id<"prizes">) {
    setRemovingPrizeId(prizeId)
    setRemovePrizeError(null)
    try {
      await removePrize({ prizeId })
    } catch {
      setRemovePrizeError("Failed to remove prize. Please try again.")
      setTimeout(() => setRemovePrizeError(null), 4000)
    } finally {
      setRemovingPrizeId(null)
    }
  }

  return (
    <div>
      {/* Back link */}
      <Link
        href={`/events/${eventId}`}
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
        {/* H39: was group-hover:text-text-accent — fixed to valid custom prop reference */}
        <span className="transition-colors group-hover:text-[var(--accent)]" style={{ color: "inherit" }}>
          {event?.name ?? "Event"}
        </span>
      </Link>

      {/* Header */}
      <h1 className="font-display text-2xl font-bold tracking-tight mb-1" style={{ color: colors.text }}>
        Prize Rounds
      </h1>
      <p className="text-sm mb-2" style={{ color: colors.textMuted }}>
        Rounds are drawn in order — Round 1 first, then Round 2, etc. Add prizes to each round.
      </p>

      {/* Tab navigation */}
      <EventTabNav eventId={eventId} />

      {/* Tier list */}
      <div className="space-y-4 mb-6">
        <AnimatePresence>
          {tiers.length === 0 ? (
            <div
              className="rounded-xl border border-dashed p-10 text-center"
              style={{ borderColor: colors.border }}
            >
              <div className="flex justify-center mb-3">
                <Gift className="w-8 h-8" style={{ color: colors.textDim }} />
              </div>
              <p className="text-sm" style={{ color: colors.textDim }}>
                No rounds yet. Add your first prize round below.
              </p>
            </div>
          ) : (
            tiers.map((tier, idx) => {
              const awardedCount = tier.prizes.filter((p: Doc<"prizes">) => p.isAwarded).length
              const isDone = tier.prizes.length > 0 && awardedCount === tier.prizes.length
              const isPendingDelete = pendingDeleteTierId === tier._id

              return (
                <motion.div
                  key={tier._id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  className="card-glass overflow-hidden"
                  style={staggerStyle(idx)}
                >
                  {/* Tier header */}
                  <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                    {/* 30px circular round badge */}
                    <div
                      className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-xs font-black font-display shrink-0"
                      style={{
                        background: isDone
                          ? "rgba(94,194,105,0.15)"
                          : colors.accentSubtle,
                        color: isDone ? colors.success : colors.accent,
                        border: `1px solid ${isDone ? "rgba(94,194,105,0.3)" : colors.accentGlow}`,
                      }}
                    >
                      {isDone ? "✓" : idx + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* H27: tier name promoted from span to h2 (same visual size) */}
                      <h2 className="font-medium text-sm inline" style={{ color: colors.text }}>
                        {tier.name}
                      </h2>
                      {/* H22: lang attribute on Chinese text */}
                      {tier.nameZh && (
                        <span lang="zh-HK" className="font-zh text-sm ml-2" style={{ color: colors.textMuted }}>
                          {tier.nameZh}
                        </span>
                      )}
                      <span className="text-xs ml-2" style={{ color: colors.textDim }}>
                        {tier.prizes.length === 0
                          ? "no prizes"
                          : isDone
                            ? "all awarded"
                            : `${tier.prizes.length - awardedCount} of ${tier.prizes.length} remaining`}
                      </span>
                    </div>

                    {/* Reorder + delete */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => reorderTier({ tierId: tier._id, direction: "up" })}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                        style={{ color: colors.textDim }}
                        onMouseEnter={e => !e.currentTarget.disabled && (e.currentTarget.style.color = colors.textMuted)}
                        onMouseLeave={e => (e.currentTarget.style.color = colors.textDim)}
                        title="Move up (draw earlier)"
                        aria-label="Move tier up"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => reorderTier({ tierId: tier._id, direction: "down" })}
                        disabled={idx === tiers.length - 1}
                        className="p-1.5 rounded-lg transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                        style={{ color: colors.textDim }}
                        onMouseEnter={e => !e.currentTarget.disabled && (e.currentTarget.style.color = colors.textMuted)}
                        onMouseLeave={e => (e.currentTarget.style.color = colors.textDim)}
                        title="Move down (draw later)"
                        aria-label="Move tier down"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isPendingDelete ? (
                        <button
                          onClick={() => handleTierDeleteClick(tier._id)}
                          className="px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors ml-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
                          style={{
                            color: colors.danger,
                            background: "rgba(212,85,85,0.12)",
                          }}
                          title="Confirm delete — this removes all prizes in this round"
                          aria-label="Confirm tier deletion"
                        >
                          Delete?
                        </button>
                      ) : (
                        <button
                          onClick={() => handleTierDeleteClick(tier._id)}
                          className="p-1.5 rounded-lg transition-colors ml-1"
                          style={{ color: colors.textDim }}
                          onMouseEnter={e => {
                            e.currentTarget.style.color = colors.danger
                            e.currentTarget.style.background = "rgba(212,85,85,0.1)"
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.color = colors.textDim
                            e.currentTarget.style.background = "transparent"
                          }}
                          title="Delete this round"
                          aria-label={`Delete tier ${tier.name}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Prizes list */}
                  <div className="px-4 pb-2">
                    {tier.prizes.length === 0 ? (
                      <p className="text-xs py-2 pl-10" style={{ color: colors.textDim }}>
                        No prizes yet — add one below
                      </p>
                    ) : (
                      <div className="space-y-1 mb-2">
                        {tier.prizes.map((prize: Doc<"prizes">) => (
                          <div
                            key={prize._id}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors group"
                            style={{ background: colors.surface }}
                            onMouseEnter={e => (e.currentTarget.style.background = colors.surfaceHover)}
                            onMouseLeave={e => (e.currentTarget.style.background = colors.surface)}
                          >
                            <Gift
                              className="w-4 h-4 shrink-0"
                              style={{ color: colors.accent }}
                            />
                            <span
                              className={`flex-1 text-sm ${prize.isAwarded ? "line-through" : ""}`}
                              style={{ color: prize.isAwarded ? colors.textDim : colors.textMuted }}
                            >
                              {prize.name}
                              {/* H22: lang attribute on Chinese text */}
                              {prize.nameZh && (
                                <span lang="zh-HK" className="font-zh ml-1.5" style={{ color: colors.textDim }}>
                                  {prize.nameZh}
                                </span>
                              )}
                            </span>
                            {prize.isAwarded ? (
                              <span className="text-xs shrink-0" style={{ color: colors.success }}>
                                awarded
                              </span>
                            ) : removingPrizeId === prize._id ? (
                              /* H2: spinner while removing */
                              <div
                                className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin shrink-0"
                                style={{ borderColor: `${colors.danger} transparent ${colors.danger} ${colors.danger}` }}
                                aria-label="Removing..."
                              />
                            ) : (
                              /* H18: focus-visible:opacity-100 makes button visible to keyboard users */
                              <button
                                onClick={() => handleRemovePrize(prize._id)}
                                className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all shrink-0 p-0.5 rounded"
                                style={{ color: colors.textDim }}
                                onMouseEnter={e => (e.currentTarget.style.color = colors.danger)}
                                onMouseLeave={e => (e.currentTarget.style.color = colors.textDim)}
                                title="Remove prize"
                                aria-label={`Remove prize ${prize.name}`}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* H2: remove prize error */}
                    {removePrizeError && (
                      <p className="text-xs mb-2 pl-10" style={{ color: colors.danger }}>
                        {removePrizeError}
                      </p>
                    )}

                    {/* Add prize input */}
                    <div className="flex gap-2 pl-10 pb-3">
                      <input
                        value={newPrizeInputs[tier._id] ?? ""}
                        onChange={e => setNewPrizeInputs(prev => ({ ...prev, [tier._id]: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            handleAddPrize(tier._id)
                          }
                        }}
                        placeholder="Prize name..."
                        className="flex-1 px-3 py-1.5 rounded-lg text-sm min-w-0 transition-colors"
                        style={{
                          background: colors.surface,
                          border: `1px solid ${addPrizeErrors[tier._id] ? colors.danger : colors.border}`,
                          color: colors.text,
                          outline: "none",
                        }}
                        onFocus={e => (e.currentTarget.style.borderColor = colors.accent)}
                        onBlur={e => (e.currentTarget.style.borderColor = addPrizeErrors[tier._id] ? colors.danger : colors.border)}
                        aria-label={`Add prize to ${tier.name}`}
                      />
                      <button
                        onClick={() => handleAddPrize(tier._id)}
                        className="btn-ghost px-3 py-1.5 text-sm shrink-0"
                      >
                        + Add
                      </button>
                    </div>
                    {/* H3: per-tier add prize error */}
                    {addPrizeErrors[tier._id] && (
                      <p className="text-xs pb-2 pl-10" style={{ color: colors.danger }}>
                        {addPrizeErrors[tier._id]}
                      </p>
                    )}
                  </div>
                </motion.div>
              )
            })
          )}
        </AnimatePresence>
      </div>

      {/* Add round form */}
      <form onSubmit={handleAddTier} className="flex gap-3">
        <input
          value={newTierName}
          onChange={e => setNewTierName(e.target.value)}
          placeholder={`Round ${tiers.length + 1} name (e.g. 3rd Prize, Grand Prize)...`}
          className="flex-1 px-4 py-3 rounded-lg transition-colors"
          style={{
            background: colors.surface,
            border: `1px solid ${addTierError ? colors.danger : colors.border}`,
            color: colors.text,
            outline: "none",
          }}
          onFocus={e => (e.currentTarget.style.borderColor = colors.accent)}
          onBlur={e => (e.currentTarget.style.borderColor = addTierError ? colors.danger : colors.border)}
          aria-label="New round name"
        />
        {/* H38: replace off-token gradient endpoints with btn-accent class */}
        <button
          type="submit"
          className="btn-accent px-5 py-3 flex items-center gap-2 shrink-0"
          disabled={!newTierName.trim()}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Round
        </button>
      </form>
      {/* H3: add tier error */}
      {addTierError && (
        <p className="text-sm mt-2" style={{ color: colors.danger }}>
          {addTierError}
        </p>
      )}

      {tiers.length > 0 && (
        <p className="text-xs italic text-center mt-3" style={{ color: colors.textDim }}>
          Use arrows to change draw order. Round 1 is drawn first.
        </p>
      )}
    </div>
  )
}
