"use client"

import Link from "next/link"

export default function RootError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-2xl text-red-300">
        !
      </div>
      <h1 className="mb-2 text-xl font-semibold text-white">Something went wrong</h1>
      <p className="mb-6 max-w-md text-sm text-white/50">
        The app hit an unexpected error while loading this page.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white/75 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          Retry
        </button>
        <Link
          href="/events"
          className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white/75 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          Back to Events
        </Link>
      </div>
    </main>
  )
}
