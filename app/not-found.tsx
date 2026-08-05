import Link from "next/link"

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center">
      <h1 className="mb-2 text-xl font-semibold text-white">Page not found</h1>
      <p className="mb-6 max-w-md text-sm text-white/50">
        This page does not exist or may have moved.
      </p>
      <Link
        href="/events"
        className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white/75 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        Back to Events
      </Link>
    </main>
  )
}
