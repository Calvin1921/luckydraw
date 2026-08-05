"use client"

import Link from "next/link"

export default function EventError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <span className="text-red-400 text-2xl">!</span>
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">Event not found</h2>
      <p className="text-white/50 mb-6 max-w-md">
        This event doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg bg-white/10 text-white/70 hover:bg-white/15 transition-colors"
        >
          Try Again
        </button>
        <Link
          href="/events"
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
        >
          Back to Events
        </Link>
      </div>
    </div>
  )
}
