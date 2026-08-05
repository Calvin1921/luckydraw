// Minimal typing for Vite's import.meta.glob, used by convex-test to discover
// Convex modules. Vite's own `vite/client` types aren't resolvable here because
// Vite is only a transitive dependency (via Vitest) under pnpm's strict layout.
interface ImportMeta {
  glob(pattern: string): Record<string, () => Promise<unknown>>
}
