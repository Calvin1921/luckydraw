"use client"

import { useAuth, UserButton } from "@clerk/nextjs"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, redirect } from "next/navigation"
import { colors } from "@/lib/design-tokens"

const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true"

// ─── Sidebar nav items ───────────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    label: "Events",
    href: "/events",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
]

// ─── Sidebar component ───────────────────────────────────────────────────────
function Sidebar({ mode, onClose }: { mode: "auth" | "dev" | "loading"; onClose?: () => void }) {
  const pathname = usePathname()

  return (
    <aside
      className="flex flex-col w-[220px] h-full border-r"
      style={{
        borderColor: colors.border,
        background: `linear-gradient(180deg, rgba(226,168,75,0.015) 0%, ${colors.bg} 100%)`,
      }}
    >
      {/* Brand */}
      <div className="px-5 pt-6 pb-5">
        <Link
          href="/events"
          className="flex items-center gap-3 group"
          onClick={onClose}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
            style={{
              background: `linear-gradient(135deg, ${colors.accent}, #c4863a)`,
              boxShadow: `0 2px 10px ${colors.accentGlow}`,
            }}
          >
            {/* M15: aria-hidden on decorative brand mark, hidden text for SR */}
            <span aria-hidden="true">✦</span>
            <span className="sr-only">Lucky Draw</span>
          </div>
          <span className="font-display text-[17px] font-bold italic tracking-tight" style={{ color: colors.text }}>
            Lucky Draw
          </span>
        </Link>
        {mode === "dev" && (
          <span
            className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded font-medium"
            style={{ background: colors.accentSubtle, color: colors.accent }}
          >
            Dev Mode
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-all duration-150 min-h-[48px]"
              style={{
                background: isActive ? colors.accentSubtle : "transparent",
                color: isActive ? colors.accent : colors.textMuted,
              }}
              aria-current={isActive ? "page" : undefined}
              onClick={onClose}
            >
              {/* M14: aria-hidden on decorative nav icons */}
              <span style={{ opacity: isActive ? 1 : 0.5 }} aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t" style={{ borderColor: colors.border }}>
        {mode === "auth" ? (
          <div className="flex items-center gap-3">
            <UserButton afterSignOutUrl="/sign-in" />
            <span className="text-xs truncate" style={{ color: colors.textMuted }}>Account</span>
          </div>
        ) : mode === "loading" ? (
          <div className="w-7 h-7 rounded-full animate-pulse" style={{ background: colors.surface }} />
        ) : (
          <span className="text-xs" style={{ color: colors.textDim }}>Demo workspace</span>
        )}
      </div>
    </aside>
  )
}

// ─── Mobile hamburger button ──────────────────────────────────────────────────
function HamburgerButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 flex items-center justify-center rounded-lg transition-colors"
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        color: colors.text,
      }}
      aria-label="Open navigation menu"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  )
}

// ─── Mobile drawer ─────────────────────────────────────────────────────────
function MobileDrawer({ mode, open, onClose }: { mode: "auth" | "dev" | "loading"; open: boolean; onClose: () => void }) {
  // Trap Escape key to close drawer
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Slide-out panel */}
      <div
        className="md:hidden fixed top-0 left-0 bottom-0 z-50 w-[220px]"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <Sidebar mode={mode} onClose={onClose} />
      </div>
    </>
  )
}

// ─── Layout ──────────────────────────────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId, orgId, isLoaded, isSignedIn } = useAuth()
  const ensureOrg = useMutation(api.organizations.ensureOrg)
  // C16: prevent repeated ensureOrg calls across re-renders
  const hasRun = useRef(false)
  const [orgError, setOrgError] = useState(false)
  // C13: mobile drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if (hasRun.current) return

    async function runEnsureOrg() {
      try {
        if (DEV_BYPASS) {
          await ensureOrg({ name: "Dev Org" })
          hasRun.current = true
          return
        }
        if (!isLoaded || !isSignedIn || !userId) return
        const identifier = orgId ?? `user_${userId}`
        await ensureOrg({ name: identifier })
        hasRun.current = true
      } catch (err) {
        console.error("ensureOrg failed:", err)
        setOrgError(true)
      }
    }

    runEnsureOrg()
  }, [isLoaded, isSignedIn, userId, orgId, ensureOrg])

  if (DEV_BYPASS) {
    return (
      <div className="min-h-screen" style={{ background: colors.bg, color: colors.text }}>
        {/* H19: skip navigation link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg"
          style={{
            background: colors.accent,
            color: colors.bg,
          }}
        >
          Skip to content
        </a>
        {/* Desktop sidebar */}
        <div className="hidden md:flex fixed top-0 left-0 bottom-0 w-[220px] z-40">
          <Sidebar mode="dev" />
        </div>
        {/* Mobile */}
        <HamburgerButton onClick={() => setDrawerOpen(true)} />
        <MobileDrawer mode="dev" open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        {/* Main content */}
        <main id="main-content" className="ml-0 md:ml-[220px] p-8 pt-16 md:pt-8">
          {orgError && (
            <div
              className="mb-6 px-4 py-3 rounded-lg text-sm flex items-center gap-2"
              style={{ background: "rgba(212,85,85,0.1)", color: colors.danger, border: `1px solid rgba(212,85,85,0.25)` }}
              role="alert"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              Failed to initialize workspace. Some features may not work.{" "}
              <button
                onClick={() => { setOrgError(false); hasRun.current = false }}
                className="underline ml-1"
                style={{ color: colors.danger }}
              >
                Retry
              </button>
            </div>
          )}
          {children}
        </main>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen" style={{ background: colors.bg, color: colors.text }}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg"
          style={{ background: colors.accent, color: colors.bg }}
        >
          Skip to content
        </a>
        <div className="hidden md:flex fixed top-0 left-0 bottom-0 w-[220px] z-40">
          <Sidebar mode="loading" />
        </div>
        <HamburgerButton onClick={() => setDrawerOpen(true)} />
        <MobileDrawer mode="loading" open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        <main id="main-content" className="ml-0 md:ml-[220px] p-8 pt-16 md:pt-8">
          <div className="flex items-center justify-center h-64" role="status" aria-label="Loading">
            <div
              className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: `${colors.accent} transparent ${colors.accent} ${colors.accent}` }}
            />
          </div>
        </main>
      </div>
    )
  }

  if (!isSignedIn) {
    redirect("/sign-in")
    return null
  }

  return (
    <div className="min-h-screen" style={{ background: colors.bg, color: colors.text }}>
      {/* H19: skip navigation link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg"
        style={{ background: colors.accent, color: colors.bg }}
      >
        Skip to content
      </a>
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:flex fixed top-0 left-0 bottom-0 w-[220px] z-40">
        <Sidebar mode="auth" />
      </div>
      {/* Mobile hamburger + drawer */}
      <HamburgerButton onClick={() => setDrawerOpen(true)} />
      <MobileDrawer mode="auth" open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      {/* Main — no left offset on mobile, full sidebar offset on md+ */}
      <main id="main-content" className="ml-0 md:ml-[220px] p-8 pt-16 md:pt-8">
        {orgError && (
          <div
            className="mb-6 px-4 py-3 rounded-lg text-sm flex items-center gap-2"
            style={{ background: "rgba(212,85,85,0.1)", color: colors.danger, border: `1px solid rgba(212,85,85,0.25)` }}
            role="alert"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            Failed to initialize workspace. Some features may not work.{" "}
            <button
              onClick={() => { setOrgError(false); hasRun.current = false }}
              className="underline ml-1"
              style={{ color: colors.danger }}
            >
              Retry
            </button>
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
