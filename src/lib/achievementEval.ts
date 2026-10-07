import { db } from '@/db'
import { ACHIEVEMENT_DEFS, type AchievementDef } from '@/features/gamification/achievements'
import { achievementStats } from '@/features/gamification/achievementStats'

/**
 * Scan all achievement definitions, unlock any newly-passing ones, and return
 * the newly-unlocked definitions so the caller can announce them.
 */
export async function evaluateAchievements(): Promise<AchievementDef[]> {
  const unlocked = new Set((await db.achievements.toArray()).map(r => r.key))
  const newlyUnlocked: AchievementDef[] = []
  const now = Date.now()
  // Only reads what the still-locked ones count
  const stat = achievementStats()

  for (const def of ACHIEVEMENT_DEFS) {
    if (unlocked.has(def.key)) continue
    if ((await stat(def.metric)) >= def.target) {
      await db.achievements.put({
        // Stable id: two devices unlocking the same achievement update one row.
        uuid: `ach-${def.key}`,
        key: def.key,
        unlockedAt: now,
        progress: 1,
        updatedAt: now,
        syncPending: true,
      })
      newlyUnlocked.push(def)
    }
  }

  return newlyUnlocked
}
