"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { parseParticipantCSV } from "@/lib/csv-parser"
import { useState, use, useEffect, useRef } from "react"
import { Trash2, AlertCircle, Users, Upload } from "lucide-react"
import Link from "next/link"
import { colors, staggerStyle } from "@/lib/design-tokens"
import { EventTabNav } from "@/components/events/EventTabNav"

export default function ParticipantsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId: rawEventId } = use(params)
  const eventId = rawEventId as Id<"drawEvents">
  const event = useQuery(api.events.get, { eventId })
  const participants = useQuery(api.participants.list, { eventId })
  const bulkImport = useMutation(api.participants.bulkImport)
  const add = useMutation(api.participants.add)
  const remove = useMutation(api.participants.remove)

  const [newName, setNewName] = useState("")
  const [csvStatus, setCsvStatus] = useState<string | null>(null)
  const [csvErrors, setCsvErrors] = useState<Array<{ row: number; message: string }>>([])
  const [csvErrorsOpen, setCsvErrorsOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  // Track which participant is pending deletion (two-step confirmation)
  const [pendingDeleteId, setPendingDeleteId] = useState<Id<"participants"> | null>(null)
  const [deletingId, setDeletingId] = useState<Id<"participants"> | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const cancelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-cancel delete confirmation after 3 seconds
  useEffect(() => {
    if (pendingDeleteId) {
      cancelTimerRef.current = setTimeout(() => {
        setPendingDeleteId(null)
      }, 3000)
    }
    return () => {
      if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current)
    }
  }, [pendingDeleteId])

  async function handleDeleteClick(id: Id<"participants">) {
    if (pendingDeleteId === id) {
      // Second click — confirm deletion
      if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current)
      setPendingDeleteId(null)
      setDeletingId(id)
      setDeleteError(null)
      try {
        await remove({ participantId: id })
      } catch {
        setDeleteError("Failed to remove participant. Please try again.")
        setTimeout(() => setDeleteError(null), 4000)
      } finally {
        setDeletingId(null)
      }
    } else {
      // First click — enter confirmation state
      if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current)
      setPendingDeleteId(id)
    }
  }

  // Clicking elsewhere cancels the pending delete
  function handleRowBlur(e: React.FocusEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current)
      setPendingDeleteId(null)
    }
  }

  async function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsImporting(true)
    setCsvStatus(null)
    setCsvErrors([])
    setCsvErrorsOpen(false)
    try {
      const text = await file.text()
      const { valid, errors } = parseParticipantCSV(text)
      if (valid.length > 0) {
        const mapped = valid.map(p => ({
          name: p.name,
          nameZh: p.nameZh ?? undefined,
          email: p.email ?? undefined,
          phone: p.phone ?? undefined,
        }))
        await bulkImport({ eventId, participants: mapped, importSource: "csv" })
      }
      setCsvStatus(
        `Imported ${valid.length}${errors.length > 0 ? `, ${errors.length} rows had errors` : ""}`
      )
      if (errors.length > 0) {
        setCsvErrors(errors)
      }
    } catch {
      setCsvStatus("Import failed. Please check your file and try again.")
    } finally {
      setIsImporting(false)
      e.target.value = ""
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setAddError(null)
    try {
      await add({ eventId, name: newName.trim() })
      setNewName("")
    } catch {
      setAddError("Failed to add participant. Please try again.")
      setTimeout(() => setAddError(null), 4000)
    }
  }

  // Loading state — skeleton rows
  if (participants === undefined) {
    return (
      <div aria-busy="true" aria-label="Loading participants">
        {/* Back link skeleton */}
        <div
          className="h-4 w-24 rounded mb-6 animate-pulse"
          style={{ background: colors.surface }}
        />
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-52 rounded-lg animate-pulse" style={{ background: colors.surface }} />
        </div>
        {/* Action bar skeleton */}
        <div className="flex gap-3 mb-6">
          <div className="h-10 w-28 rounded-lg animate-pulse" style={{ background: colors.surface }} />
          <div className="h-10 flex-1 rounded-lg animate-pulse" style={{ background: colors.surface }} />
          <div className="h-10 w-16 rounded-lg animate-pulse" style={{ background: colors.surface }} />
        </div>
        {/* Row skeletons */}
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-14 rounded-lg animate-pulse"
              style={{ background: colors.surface }}
            />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (event !== undefined && event !== null && participants === null) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: "rgba(212,85,85,0.1)" }}
        >
          <AlertCircle className="w-6 h-6" style={{ color: colors.danger }} />
        </div>
        <div className="text-center">
          <p className="font-medium" style={{ color: colors.text }}>
            Failed to load participants
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
        <span className="group-hover:text-[var(--accent)] transition-colors" style={{ color: "inherit" }}>
          {event?.name ?? "Event"}
        </span>
      </Link>

      {/* Header — M11: heading stays font-display, count moves to font-body span */}
      <div className="flex items-baseline justify-between mb-2 gap-4">
        <h1 className="font-display text-2xl font-bold tracking-tight" style={{ color: colors.text }}>
          Participants{" "}
          <span className="font-body text-xl font-normal opacity-60" style={{ color: colors.textMuted }}>
            ({participants.length})
          </span>
        </h1>
        {/* M17: include file type in download link text */}
        <a
          href="/csv-template.csv"
          download
          className="text-sm transition-colors shrink-0"
          style={{ color: colors.textDim }}
          onMouseEnter={e => (e.currentTarget.style.color = colors.accent)}
          onMouseLeave={e => (e.currentTarget.style.color = colors.textDim)}
        >
          Download CSV template (.csv)
        </a>
      </div>

      {/* Tab navigation */}
      <EventTabNav eventId={eventId} />

      {/* Action bar — M10: stacks on mobile */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <label
          className={`btn-ghost cursor-pointer w-full sm:w-auto shrink-0 ${isImporting ? "opacity-50 pointer-events-none" : ""}`}
        >
          {isImporting ? "Importing..." : "Import CSV"}
          <input
            type="file"
            accept=".csv,.txt"
            onChange={handleCSV}
            className="hidden"
            disabled={isImporting}
            aria-label="Import participants from CSV"
          />
        </label>

        <form onSubmit={handleAdd} className="flex gap-2 flex-1">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Participant name..."
            className="flex-1 px-4 py-2 rounded-lg text-sm transition-colors"
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              color: colors.text,
              outline: "none",
            }}
            onFocus={e => (e.currentTarget.style.borderColor = colors.accent)}
            onBlur={e => (e.currentTarget.style.borderColor = colors.border)}
            aria-label="New participant name"
          />
          <button
            type="submit"
            className="btn-accent shrink-0"
            disabled={!newName.trim()}
          >
            Add
          </button>
        </form>
      </div>

      {/* H4: inline add error */}
      {addError && (
        <p className="text-sm mb-3 flex items-center gap-1.5" style={{ color: colors.danger }}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          {addError}
        </p>
      )}

      {/* H1: inline delete error */}
      {deleteError && (
        <p className="text-sm mb-3 flex items-center gap-1.5" style={{ color: colors.danger }}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          {deleteError}
        </p>
      )}

      {/* CSV import status — H9: collapsible error list */}
      {csvStatus && (
        <div className="mb-4">
          <p className="text-sm" style={{ color: csvErrors.length > 0 ? colors.warning : colors.success }}>
            {csvStatus}
          </p>
          {csvErrors.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setCsvErrorsOpen(o => !o)}
                className="text-xs underline"
                style={{ color: colors.textDim }}
              >
                {csvErrorsOpen ? "Hide" : "Show"} {csvErrors.length} error{csvErrors.length !== 1 ? "s" : ""}
              </button>
              {csvErrorsOpen && (
                <ul className="mt-2 space-y-1 text-xs rounded-lg p-3" style={{ background: colors.surface }}>
                  {csvErrors.map((err, i) => (
                    <li key={i} style={{ color: colors.textMuted }}>
                      <span style={{ color: colors.textDim }}>Row {err.row}:</span> {err.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Participant list */}
      {participants.length === 0 ? (
        /* M5: empty state with icon and actionable import trigger */
        <div className="py-16 text-center flex flex-col items-center gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: colors.surface }}
          >
            <Users className="w-7 h-7" style={{ color: colors.textDim }} />
          </div>
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: colors.textMuted }}>
              No participants yet
            </p>
            <p className="text-xs" style={{ color: colors.textDim }}>
              Add manually above or{" "}
              <label className="underline cursor-pointer" style={{ color: colors.accent }}>
                <Upload className="inline w-3 h-3 mr-0.5 relative -top-px" />
                import a CSV
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleCSV}
                  className="hidden"
                  aria-label="Import participants from CSV"
                />
              </label>
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {participants.map((p, i) => {
            const isPending = pendingDeleteId === p._id
            const isDeleting = deletingId === p._id
            return (
              <div
                key={p._id}
                className="stagger-item flex items-center justify-between px-4 py-3 rounded-lg transition-colors group"
                style={{
                  ...staggerStyle(i),
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  opacity: isDeleting ? 0.5 : 1,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = colors.surfaceHover)}
                onMouseLeave={e => (e.currentTarget.style.background = colors.surface)}
                onBlur={handleRowBlur}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-body font-medium text-sm" style={{ color: colors.text }}>
                    {p.name}
                  </span>
                  {/* H22: lang attribute on Chinese text */}
                  {p.nameZh && (
                    <span lang="zh-HK" className="font-zh text-sm" style={{ color: colors.textMuted }}>
                      {p.nameZh}
                    </span>
                  )}
                  {p.email && (
                    <span className="text-xs hidden sm:block truncate" style={{ color: colors.textDim }}>
                      {p.email}
                    </span>
                  )}
                </div>

                {/* H1: spinner while deleting */}
                {isDeleting ? (
                  <div
                    className="w-[44px] h-[44px] flex items-center justify-center shrink-0"
                    aria-label="Removing..."
                  >
                    <div
                      className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                      style={{ borderColor: `${colors.danger} transparent ${colors.danger} ${colors.danger}` }}
                    />
                  </div>
                ) : isPending ? (
                  <button
                    onClick={() => handleDeleteClick(p._id)}
                    className="text-xs font-semibold px-3 py-2 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
                    style={{
                      color: colors.danger,
                      background: "rgba(212,85,85,0.1)",
                    }}
                    aria-label={`Confirm removal of ${p.name}`}
                  >
                    Remove?
                  </button>
                ) : (
                  /* H17: focus-visible:opacity-100 makes button visible to keyboard users */
                  <button
                    onClick={() => handleDeleteClick(p._id)}
                    className="p-2 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                    style={{ color: colors.textDim }}
                    onMouseEnter={e => {
                      e.currentTarget.style.color = colors.danger
                      e.currentTarget.style.background = "rgba(212,85,85,0.1)"
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.color = colors.textDim
                      e.currentTarget.style.background = "transparent"
                    }}
                    aria-label={`Remove ${p.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
