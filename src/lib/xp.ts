import { db } from '@/db'

export const XP = {
  KCAL_TARGET_HIT: 30,
  PROTEIN_TARGET_HIT: 20,
  WEEKLY_RECAP: 25,
} as const

export function xpForLevel(level: number): number {
  return Math.round(100 * Math.pow(level, 1.5))
}

export interface GrantXpResult {
  newXp: number
  newLevel: number
  leveledUp: boolean
  levelsGained: number
}

/**
 * Add XP to userStats, rolling over level-ups. Persists changes.
 * Returns the updated state so callers can toast on level-up.
 */
export async function grantXp(amount: number): Promise<GrantXpResult | null> {
  if (amount <= 0) return null
  const stats = await db.userStats.get(1)
  if (!stats) return null

  let xp = stats.xp + amount
  let level = stats.level
  let levelsGained = 0

  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level)
    level += 1
    levelsGained += 1
  }

  await db.userStats.update(1, {
    xp,
    level,
    updatedAt: Date.now(),
    syncPending: true,
  })

  return {
    newXp: xp,
    newLevel: level,
    leveledUp: levelsGained > 0,
    levelsGained,
  }
}
