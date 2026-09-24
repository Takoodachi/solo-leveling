import { toast } from 'sonner'
import { db } from '@/db'
import { today } from '@/lib/date'
import { requestSync, deleteSynced } from '@/lib/sync'
import { updateStreak } from '@/lib/streak'
import { evaluateAchievements } from '@/lib/achievementEval'
import { checkDailyTargetsAndGrant } from '@/lib/dailyTargetXp'
import type { Food, FoodLog, MealType } from '@/types'

export type NewFoodLog = Pick<FoodLog, 'date' | 'foodId' | 'servings' | 'mealType'>
export interface MealItem { foodId: string; servings: number }

/**
 * Log one or more foods, then update the streak, target XP and achievements once.
 * Returns the new log ids (for undo).
 */
export async function logFoods(entries: NewFoodLog[]): Promise<string[]> {
  if (entries.length === 0) return []
  const now = Date.now()
  const rows: FoodLog[] = entries.map(e => ({ ...e, uuid: crypto.randomUUID(), updatedAt: now, syncPending: true }))
  await db.foodLog.bulkAdd(rows)

  // Streak only updates when the user actually logged for today.
  const day = today()
  if (entries.some(e => e.date === day)) {
    await updateStreak()
    for (const label of await checkDailyTargetsAndGrant(day)) {
      toast.success(`Hit your daily ${label} — +XP`, { icon: '🎯' })
    }
  }
  for (const ach of await evaluateAchievements()) {
    toast.success(`Achievement unlocked: ${ach.title}`, { icon: ach.icon })
  }
  requestSync()
  return rows.map(r => r.uuid)
}

/** Log a meal's items (saved or repeated) into `mealType` on `date`, skipping foods that no longer exist. */
export async function logMealItems(items: MealItem[], date: string, mealType: MealType): Promise<string[]> {
  const foods = await db.foods.bulkGet(items.map(i => i.foodId))
  return logFoods(items.filter((_, i) => foods[i]).map(i => ({ date, mealType, foodId: i.foodId, servings: i.servings })))
}

/** How much of a food was logged last time (1 serving if never), so a repeat is one tap. */
export async function lastServings(foodId: string): Promise<number> {
  const logs = await db.foodLog.where('foodId').equals(foodId).toArray()
  let last: FoodLog | undefined
  for (const l of logs) {
    if (!last || l.date > last.date || (l.date === last.date && l.updatedAt > last.updatedAt)) last = l
  }
  return last?.servings ?? 1
}

export async function unlogFoods(uuids: string[]): Promise<void> {
  await deleteSynced(db.foodLog, 'food_log', uuids)
}

/** "Added 3 items to lunch" with an Undo button. */
export function toastLogged(message: string, uuids: string[]): void {
  if (uuids.length === 0) return
  toast.success(message, { action: { label: 'Undo', onClick: () => void unlogFoods(uuids) } })
}

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

/** "1 item" / "3 items". */
export function itemCount(n: number): string {
  return `${n} item${n === 1 ? '' : 's'}`
}

/** "150 g" or "2 × 1 slice". */
export function amountLabel(food: Food, servings: number): string {
  return food.servingUnit === 'g' || food.servingUnit === 'ml'
    ? `${Math.round(servings * food.servingSize)} ${food.servingUnit}`
    : `${Math.round(servings * 100) / 100} × ${food.servingSize} ${food.servingUnit}`
}
