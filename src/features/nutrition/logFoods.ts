import { toast } from 'sonner'
import { db } from '@/db'
import { today } from '@/lib/date'
import { requestSync, deleteSynced } from '@/lib/sync'
import { updateStreak } from '@/lib/streak'
import { evaluateAchievements } from '@/lib/achievementEval'
import { announceAchievements } from '@/features/gamification/announce'
import { checkDailyTargetsAndGrant } from '@/lib/dailyTargetXp'
import type { Food, FoodLog, FoodLogWithFood, MealType } from '@/types'
import { isQuickAdd, metricLabel, metricOf, ozLabel, ozOf, unitFor, usesGrams } from './foodAmount'

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
  await announceAchievements(await evaluateAchievements())
  requestSync()
  return rows.map(r => r.uuid)
}

/** Log a meal's items (saved or repeated) into `mealType` on `date`, skipping foods that no longer exist or were removed. */
export async function logMealItems(items: MealItem[], date: string, mealType: MealType): Promise<string[]> {
  const foods = await db.foods.bulkGet(items.map(i => i.foodId))
  return logFoods(items.filter((_, i) => foods[i] && !foods[i].removed).map(i => ({ date, mealType, foodId: i.foodId, servings: i.servings })))
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

/** Correct a logged food: how much was eaten, and the meal it belongs to. Today's targets are checked again: the change may have met one. */
export async function updateFoodLog(uuid: string, servings: number, mealType: MealType): Promise<void> {
  const log = await db.foodLog.get(uuid)
  if (!log || !(servings > 0) || (log.servings === servings && log.mealType === mealType)) return
  await db.foodLog.update(uuid, { servings, mealType, updatedAt: Date.now(), syncPending: true })
  if (log.date === today()) {
    for (const label of await checkDailyTargetsAndGrant(log.date)) {
      toast.success(`Hit your daily ${label} — +XP`, { icon: '🎯' })
    }
  }
  requestSync()
}

export async function unlogFoods(uuids: string[]): Promise<void> {
  await deleteSynced(db.foodLog, 'food_log', uuids)
}

/** Take a logged food off its day, with an Undo: one tap on a small bin shouldn't be final. */
export async function removeFoodLog({ food, ...log }: FoodLogWithFood): Promise<void> {
  await unlogFoods([log.uuid])
  toast(`Removed ${isQuickAdd(food) ? 'calories' : food.name}`, {
    action: {
      label: 'Undo',
      // Back as a new row: the old id is already on its way to the other devices as a delete
      onClick: () => void db.foodLog.add({ ...log, uuid: crypto.randomUUID(), updatedAt: Date.now(), syncPending: true }).then(() => requestSync()),
    },
  })
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

/** The four meals, for a control that picks one. */
export const MEAL_OPTIONS = (Object.keys(MEAL_LABELS) as MealType[]).map(value => ({ value, label: MEAL_LABELS[value] }))

/** "1 item" / "3 items". */
export function itemCount(n: number): string {
  return `${n} item${n === 1 ? '' : 's'}`
}

/** "150 g" (or "5.3 oz", if ounces were picked last) or "2 × 1 slice". */
export function amountLabel(food: Food, servings: number): string {
  if (isQuickAdd(food)) return 'Calories only'
  // A portion food (a bowl) reads as servings even where its weight is known
  if (!usesGrams(food)) return `${Math.round(servings * 100) / 100} × ${food.servingSize} ${food.servingUnit}`
  return unitFor(food) === 'oz' ? `${ozOf(food, servings)} ${ozLabel(food)}` : `${metricOf(food, servings)} ${metricLabel(food)}`
}
