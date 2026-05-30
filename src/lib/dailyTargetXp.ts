import { db } from '@/db'
import { grantXp, XP } from './xp'

const KCAL_KEY = 'solo:xp:kcal'
const PROTEIN_KEY = 'solo:xp:protein'
const KCAL_TOLERANCE = 0.1 // within ±10% of target counts as "hit"

/**
 * Check today's totals and grant kcal/protein-target XP once per local day.
 * Uses localStorage to avoid double-granting on the same device.
 * Returns the labels of the targets just hit (for toasting).
 */
export async function checkDailyTargetsAndGrant(date: string): Promise<string[]> {
  const targets = await db.targets.get(1)
  if (!targets) return []

  const logs = await db.foodLog.where('date').equals(date).toArray()
  if (logs.length === 0) return []

  const foodIds = [...new Set(logs.map(l => l.foodId))]
  const foods = await db.foods.bulkGet(foodIds)
  const foodMap = new Map(foods.flatMap(f => (f ? [[f.uuid, f]] : [])))

  let kcal = 0
  let protein = 0
  for (const log of logs) {
    const food = foodMap.get(log.foodId)
    if (!food) continue
    kcal += food.kcalPerServing * log.servings
    protein += food.protein * log.servings
  }

  const hits: string[] = []

  if (targets.dailyKcal > 0) {
    const lower = targets.dailyKcal * (1 - KCAL_TOLERANCE)
    const upper = targets.dailyKcal * (1 + KCAL_TOLERANCE)
    if (kcal >= lower && kcal <= upper && localStorage.getItem(`${KCAL_KEY}:${date}`) !== '1') {
      await grantXp(XP.KCAL_TARGET_HIT)
      localStorage.setItem(`${KCAL_KEY}:${date}`, '1')
      hits.push('calorie target')
    }
  }

  if (targets.dailyProtein > 0) {
    if (protein >= targets.dailyProtein && localStorage.getItem(`${PROTEIN_KEY}:${date}`) !== '1') {
      await grantXp(XP.PROTEIN_TARGET_HIT)
      localStorage.setItem(`${PROTEIN_KEY}:${date}`, '1')
      hits.push('protein target')
    }
  }

  return hits
}
