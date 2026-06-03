import { db } from '@/db'
import { ACHIEVEMENT_DEFS, type AchievementDef } from '@/features/gamification/achievements'
import { today } from '@/lib/date'
import { subDays, format, parseISO } from 'date-fns'

async function alreadyUnlocked(): Promise<Set<string>> {
  const rows = await db.achievements.toArray()
  return new Set(rows.map(r => r.key))
}

async function checkProteinGoal7Days(): Promise<boolean> {
  const targets = await db.targets.get(1)
  if (!targets) return false
  const proteinTarget = targets.dailyProtein
  if (proteinTarget <= 0) return false

  const todayDate = parseISO(today())
  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    dates.push(format(subDays(todayDate, i), 'yyyy-MM-dd'))
  }

  for (const d of dates) {
    const logs = await db.foodLog.where('date').equals(d).toArray()
    if (logs.length === 0) return false

    const foodIds = [...new Set(logs.map(l => l.foodId))]
    const foods = await db.foods.bulkGet(foodIds)
    const foodMap = new Map(foods.flatMap(f => (f ? [[f.uuid, f]] : [])))

    let proteinTotal = 0
    for (const log of logs) {
      const food = foodMap.get(log.foodId)
      if (food) proteinTotal += food.protein * log.servings
    }
    if (proteinTotal < proteinTarget) return false
  }
  return true
}

async function isUnlocked(key: string): Promise<boolean> {
  switch (key) {
    case 'week_streak': {
      const s = await db.userStats.get(1)
      return (s?.longestStreak ?? 0) >= 7
    }
    case 'month_streak': {
      const s = await db.userStats.get(1)
      return (s?.longestStreak ?? 0) >= 30
    }
    case 'level_5': {
      const s = await db.userStats.get(1)
      return (s?.level ?? 1) >= 5
    }
    case 'level_10': {
      const s = await db.userStats.get(1)
      return (s?.level ?? 1) >= 10
    }
    case 'first_calorie_log': return (await db.foodLog.count()) >= 1
    case 'protein_goal':      return await checkProteinGoal7Days()
    case 'weight_logged':     return (await db.bodyMetrics.count()) >= 1
    default:                  return false
  }
}

/**
 * Scan all achievement definitions, unlock any newly-passing ones, and return
 * the newly-unlocked definitions so the caller can toast them.
 */
export async function evaluateAchievements(): Promise<AchievementDef[]> {
  const unlocked = await alreadyUnlocked()
  const newlyUnlocked: AchievementDef[] = []
  const now = Date.now()

  for (const def of ACHIEVEMENT_DEFS) {
    if (unlocked.has(def.key)) continue
    if (await isUnlocked(def.key)) {
      await db.achievements.add({
        uuid: crypto.randomUUID(),
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
