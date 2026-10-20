import { toast } from 'sonner'
import { db } from '@/db'
import { ACHIEVEMENT_DEFS, achievementDef, achievementXp, type AchievementDef } from '@/features/gamification/achievements'
import { achievementStats } from '@/features/gamification/achievementStats'
import { grantXp, type GrantXpResult } from '@/lib/xp'
import { requestSync } from '@/lib/sync'
import { today } from '@/lib/date'

const levelUp = (r: GrantXpResult | null) => r?.leveledUp && toast.success(`Level up! You're now level ${r.newLevel}`, { icon: '⭐' })

/**
 * Scan all achievement definitions, unlock any newly-passing ones, pay their XP, and return
 * the newly-unlocked definitions so the caller can announce them. A pass at a time: the XP can
 * lift the level, and the level achievements unlocked by that are caught by the next pass.
 */
export async function evaluateAchievements(): Promise<AchievementDef[]> {
  const all: AchievementDef[] = []
  for (let pass = 0; pass < 3; pass++) {
    const unlocked = new Set((await db.achievements.toArray()).map(r => r.key))
    const fresh: AchievementDef[] = []
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
        fresh.push(def)
      }
    }
    if (fresh.length === 0) break
    all.push(...fresh)
    levelUp(await grantXp(fresh.reduce((xp, d) => xp + achievementXp(d), 0)))
  }
  if (all.length) requestSync()
  return all
}

const BACKFILL_ID = 'achxp-backfill'

/**
 * Once per account (a synced check-in row marks it, so it's paid on one device only, as the daily
 * quest is): the XP for the achievements earned before achievements gave any. Run after a sync.
 */
export async function backfillAchievementXp(): Promise<void> {
  if (await db.checkins.get(BACKFILL_ID)) return
  const xp = (await db.achievements.toArray()).reduce((sum, r) => {
    const def = achievementDef(r.key)
    return sum + (def ? achievementXp(def) : 0)
  }, 0)
  await db.checkins.put({ uuid: BACKFILL_ID, date: today(), key: 'achxp', done: true, updatedAt: Date.now(), syncPending: true })
  if (xp > 0) {
    const result = await grantXp(xp)
    toast.success(`+${xp.toLocaleString()} XP from your achievements`, { icon: '🏅', description: 'Achievements now count toward your level.' })
    levelUp(result)
  }
  requestSync()
}
