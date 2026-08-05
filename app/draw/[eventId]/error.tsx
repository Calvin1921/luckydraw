"use client"

import Link from "next/link"

function getContextualMessage(error: Error): string {
  const msg = error?.message ?? ""
  if (msg.match(/not found/i)) {
    return "Event or session not found. The link may be incorrect or the event may have ended."
  }
  if (msg.match(/network|fetch|failed to fetch/i)) {
    return "Connection lost. Check your network and try again."
  }
  if (msg.match(/unauthorized|forbidden/i)) {
    return "You don't have permission to access this page."
  }
  return "Something went wrong — check your connection and try again."
}

export default function DrawError({ error, reset }: { error: Error; reset: () => void }) {
  const message = getContextualMessage(error)

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <span className="text-red-400 text-2xl" aria-hidden>!</span>
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">Something went wrong</h2>
      <p className="text-white/50 mb-6 max-w-sm">
        {message}
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg bg-white/10 text-white/70 hover:bg-white/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          Retry
        </button>
        <Link
          href="/events"
          className="px-4 py-2 rounded-lg bg-white/10 text-white/70 hover:bg-white/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
