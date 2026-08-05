"use client"

import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { api } from "@/convex/_generated/api"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, Calendar } from "lucide-react"
import { colors } from "@/lib/design-tokens"

// ─── Constants ───────────────────────────────────────────────────────────────

const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true"

// ─── Input component ─────────────────────────────────────────────────────────
// Encapsulates the focus-ring token behaviour without inline event handlers
// spread across every field.

interface FieldInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  hint?: string
  showRequired?: boolean
  error?: string
}

function FieldInput({ id, label, hint, showRequired, error, className, ...rest }: FieldInputProps) {
  const [focused, setFocused] = useState(false)
  const errorId = `${id}-error`
  const hasError = Boolean(error)

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium mb-2"
        style={{ color: colors.textMuted }}
      >
        {label}
        {showRequired && (
          <span className="ml-1" style={{ color: colors.accent }} aria-hidden="true">
            *
          </span>
        )}
      </label>
      <input
        id={id}
        {...rest}
        onFocus={e => {
          setFocused(true)
          rest.onFocus?.(e)
        }}
        onBlur={e => {
          setFocused(false)
          rest.onBlur?.(e)
        }}
        aria-invalid={hasError ? "true" : undefined}
        aria-describedby={hasError ? errorId : undefined}
        className={`w-full px-4 py-3 rounded-xl text-sm transition-colors ${className ?? ""}`}
        style={{
          background: colors.surface,
          border: `1px solid ${hasError ? colors.danger : focused ? colors.accent : colors.border}`,
          color: colors.text,
          outline: "none",
          boxShadow: focused
            ? `0 0 0 3px ${hasError ? "rgba(212,85,85,0.15)" : colors.accentGlow}`
            : "none",
        }}
      />
      {hasError && (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 text-xs"
          style={{ color: colors.danger }}
        >
          {error}
        </p>
      )}
      {hint && !hasError && (
        <p className="mt-1.5 text-xs" style={{ color: colors.textDim }}>
          {hint}
        </p>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewEventPage() {
  const router = useRouter()
  const { userId, orgId } = useAuth()
  const identifier = DEV_BYPASS
    ? "dev_bypass_org"
    : orgId ?? (userId ? `user_${userId}` : null)

  const org = useQuery(
    api.organizations.getByClerkOrgId,
    identifier ? { clerkOrgId: identifier } : "skip"
  )
  const createEvent = useMutation(api.events.create)

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!org) return

    const fd = new FormData(e.currentTarget)
    const name = (fd.get("name") as string).trim()

    // Client-side validation — no browser-native popups
    const errors: Record<string, string> = {}
    if (!name) {
      errors["event-name"] = "Event name is required."
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      // Move focus to the first errored field
      const firstKey = Object.keys(errors)[0]
      document.getElementById(firstKey)?.focus()
      return
    }

    setFieldErrors({})
    setLoading(true)
    setSubmitError(null)

    try {
      const eventId = await createEvent({
        orgId: org._id,
        name,
        nameZh: (fd.get("nameZh") as string).trim() || undefined,
        eventDate: fd.get("eventDate")
          ? new Date(fd.get("eventDate") as string).getTime()
          : undefined,
      })
      router.push(`/events/${eventId}`)
    } catch (err) {
      setSubmitError((err as Error).message)
      setLoading(false)
    }
  }

  const isDisabled = loading || !org

  return (
    <div className="max-w-lg mx-auto">
      {/* ── Back link ──────────────────────────────────────────────────────── */}
      <Link
        href="/events"
        className="inline-flex items-center gap-1.5 text-sm mb-8 transition-colors group"
        style={{ color: colors.textDim }}
      >
        <ArrowLeft
          className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
          aria-hidden="true"
        />
        <span className="group-hover:text-accent transition-colors" style={{ color: "inherit" }}>
          Events
        </span>
      </Link>

      {/* ── Heading ────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="mb-8"
      >
        <h1
          className="font-display text-4xl font-semibold italic"
          style={{ color: colors.text }}
        >
          New Event
        </h1>
        <p className="text-sm mt-2" style={{ color: colors.textMuted }}>
          Fill in the details below. You can always change them later.
        </p>
        <p className="text-sm mt-1" style={{ color: colors.textDim }}>
          * Required field
        </p>
      </motion.div>

      {/* ── Form ───────────────────────────────────────────────────────────── */}
      <motion.form
        onSubmit={handleSubmit}
        className="space-y-5"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}
        noValidate
      >
        {/* Event Name EN */}
        <FieldInput
          id="event-name"
          name="name"
          label="Event Name (English)"
          showRequired
          placeholder="Annual Dinner 2026"
          autoComplete="off"
          disabled={isDisabled}
          error={fieldErrors["event-name"]}
        />

        {/* Event Name ZH */}
        <FieldInput
          id="event-name-zh"
          name="nameZh"
          label="Event Name (Chinese)"
          placeholder="2026年週年晚宴"
          autoComplete="off"
          disabled={isDisabled}
          className="font-zh"
          hint="Optional — shown on bilingual stage screens"
          error={fieldErrors["event-name-zh"]}
        />

        {/* Event Date */}
        <div>
          <label
            htmlFor="event-date"
            className="block text-sm font-medium mb-2"
            style={{ color: colors.textMuted }}
          >
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" aria-hidden="true" style={{ color: colors.textDim }} />
              Event Date
            </span>
          </label>
          <DateInput id="event-date" name="eventDate" disabled={isDisabled} />
          <p className="mt-1.5 text-xs" style={{ color: colors.textDim }}>
            Optional — used for display purposes only
          </p>
        </div>

        {/* Submit-level error (e.g. network/Convex error) */}
        {submitError && (
          <motion.div
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm"
            style={{
              background: "rgba(212,85,85,0.1)",
              border: "1px solid rgba(212,85,85,0.25)",
              color: colors.danger,
            }}
          >
            <span aria-hidden="true">⚠</span>
            {submitError}
          </motion.div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isDisabled}
          className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-150 mt-2"
          style={{
            background: isDisabled
              ? "rgba(226,168,75,0.25)"
              : "linear-gradient(135deg, #e2a84b 0%, #f0bc66 50%, #e2a84b 100%)",
            color: isDisabled ? "rgba(11,10,15,0.4)" : colors.bg,
            boxShadow: isDisabled
              ? "none"
              : "0 4px 16px rgba(226,168,75,0.25), 0 1px 0 rgba(255,255,255,0.15) inset",
            cursor: isDisabled ? "not-allowed" : "pointer",
          }}
          aria-busy={loading}
        >
          {loading ? (
            <span className="inline-flex items-center justify-center gap-2">
              <span
                className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: "rgba(11,10,15,0.4)", borderTopColor: "transparent" }}
                aria-hidden="true"
              />
              Creating…
            </span>
          ) : (
            "Create Event"
          )}
        </button>

        {/* Disabled hint when org is still loading */}
        {!org && !loading && (
          <p className="text-center text-xs" style={{ color: colors.textDim }}>
            Loading organization…
          </p>
        )}
      </motion.form>
    </div>
  )
}

// ─── Date input — separated to isolate focus state ────────────────────────────

function DateInput({
  id,
  name,
  disabled,
}: {
  id: string
  name: string
  disabled?: boolean
}) {
  const [focused, setFocused] = useState(false)

  return (
    <input
      id={id}
      name={name}
      type="date"
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="w-full px-4 py-3 rounded-xl text-sm transition-colors appearance-none [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-40"
      style={{
        background: colors.surface,
        border: `1px solid ${focused ? colors.accent : colors.border}`,
        color: colors.text,
        outline: "none",
        boxShadow: focused ? `0 0 0 3px ${colors.accentGlow}` : "none",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    />
  )
}
