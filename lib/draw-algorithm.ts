type Participant = { _id: string; name: string; nameZh: string | null; isEligible: boolean }

export function buildEligiblePool<T extends Participant>(participants: T[]): T[] {
  const pool = participants.filter(p => p.isEligible)
  if (pool.length === 0) throw new Error("No eligible participants")
  return pool
}

export function selectWinner<T extends Participant>(participants: T[]): {
  winner: T
  seed: string
} {
  const pool = buildEligiblePool(participants)
  // Web Crypto CSPRNG — seed stored in DrawSession for audit trail
  const randomBytes = crypto.getRandomValues(new Uint32Array(1))
  const seed = randomBytes[0].toString(16).padStart(8, "0")
  // Modulo bias negligible: pool size << 2^32
  const index = randomBytes[0] % pool.length
  return { winner: pool[index], seed }
}
