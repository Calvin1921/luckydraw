"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { colors } from "@/lib/design-tokens"

const TABS = [
  { label: "Overview", segment: null },
  { label: "Participants", segment: "participants" },
  { label: "Prizes", segment: "prizes" },
  { label: "Preset", segment: "branding" },
] as const

interface EventTabNavProps {
  eventId: string
}

/**
 * Shared tab navigation bar used across all event sub-pages.
 *
 * Active state is derived from the current pathname via usePathname(),
 * so no `isActive` prop is needed. The Overview tab is active when the
 * pathname is exactly `/events/[eventId]`.
 */
export function EventTabNav({ eventId }: EventTabNavProps) {
  const pathname = usePathname()
  const baseHref = `/events/${eventId}`

  return (
    <nav
      className="flex gap-1 border-b mb-6"
      style={{ borderColor: colors.border }}
      aria-label="Event sections"
    >
      {TABS.map((tab) => {
        const href = tab.segment ? `${baseHref}/${tab.segment}` : baseHref
        // Overview is active only on exact match; sub-pages use exact segment match
        const isActive = tab.segment
          ? pathname === href
          : pathname === baseHref

        return (
          <Link
            key={href}
            href={href}
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors"
            style={{
              borderColor: isActive ? colors.accent : "transparent",
              color: isActive ? colors.accent : colors.textMuted,
            }}
            aria-current={isActive ? "page" : undefined}
            onMouseEnter={(e) => {
              if (!isActive) {
                ;(e.currentTarget as HTMLAnchorElement).style.color = colors.text
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                ;(e.currentTarget as HTMLAnchorElement).style.color = colors.textMuted
              }
            }}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
