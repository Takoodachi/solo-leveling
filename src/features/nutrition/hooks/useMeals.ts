import { useLiveQuery } from 'dexie-react-hooks'
import { differenceInCalendarDays, format, parseISO, subDays } from 'date-fns'
import { db } from '@/db'
import { requestSync, deleteSynced } from '@/lib/sync'
import type { Food, FoodLogWithFood, MealType, SavedMeal } from '@/types'
import type { MealItem } from '../logFoods'

const RECENT_DAYS = 14
const MAX_RECENT = 5

/** A meal as shown in the quick-add lists: what's in it and what it adds up to. */
export interface MealSummary {
  items: MealItem[]
  names: string
  kcal: number
}

export interface PastMeal extends MealSummary { date: string }
export interface SavedMealWithSummary extends SavedMeal, MealSummary {}

function summarize(items: MealItem[], foods: Map<string, Food>): MealSummary {
  const known = items.filter(i => foods.has(i.foodId))
  return {
    items: known,
    names: known.map(i => foods.get(i.foodId)!.name).join(', '),
    kcal: Math.round(known.reduce((sum, i) => sum + foods.get(i.foodId)!.kcalPerServing * i.servings, 0)),
  }
}

async function foodMap(ids: string[]): Promise<Map<string, Food>> {
  const foods = await db.foods.bulkGet([...new Set(ids)])
  return new Map(foods.flatMap(f => (f ? [[f.uuid, f]] : [])))
}

/**
 * The last few different versions of this meal from the two weeks before `date`,
 * newest first (the same foods in the same amounts count once).
 */
export function useRecentMeals(mealType: MealType, date: string): PastMeal[] | undefined {
  return useLiveQuery(async () => {
    const since = format(subDays(parseISO(date), RECENT_DAYS), 'yyyy-MM-dd')
    const logs = await db.foodLog.where('date').between(since, date, true, false).filter(l => l.mealType === mealType).toArray()
    const foods = await foodMap(logs.map(l => l.foodId))

    const byDate = new Map<string, MealItem[]>()
    for (const l of logs) byDate.set(l.date, [...(byDate.get(l.date) ?? []), { foodId: l.foodId, servings: l.servings }])

    const seen = new Set<string>()
    const out: PastMeal[] = []
    for (const d of [...byDate.keys()].sort().reverse()) {
      const meal = summarize(byDate.get(d)!, foods)
      const signature = meal.items.map(i => `${i.foodId}:${i.servings}`).sort().join('|')
      if (meal.items.length === 0 || seen.has(signature)) continue
      seen.add(signature)
      out.push({ ...meal, date: d })
      if (out.length === MAX_RECENT) break
    }
    return out
  }, [mealType, date])
}

/** "yesterday", "Monday" (this past week) or "12 Sep". */
export function pastDayLabel(pastDate: string, date: string): string {
  const days = differenceInCalendarDays(parseISO(date), parseISO(pastDate))
  if (days === 1) return 'yesterday'
  return days < 7 ? format(parseISO(pastDate), 'EEEE') : format(parseISO(pastDate), 'd MMM')
}

export function useSavedMeals(): SavedMealWithSummary[] | undefined {
  return useLiveQuery(async () => {
    const meals = await db.savedMeals.orderBy('name').toArray()
    const foods = await foodMap(meals.flatMap(m => m.items.map(i => i.foodId)))
    return meals.map(m => ({ ...m, ...summarize(m.items, foods) }))
  }, [])
}

export async function saveMeal(name: string, mealType: MealType, entries: FoodLogWithFood[]): Promise<void> {
  await db.savedMeals.add({
    uuid: crypto.randomUUID(),
    name: name.trim(),
    items: entries.map(e => ({ foodId: e.foodId, servings: e.servings })),
    mealType,
    updatedAt: Date.now(),
    syncPending: true,
  })
  requestSync()
}

/** Delete a saved meal; returns a function that restores it (as a new row, since the old id is tombstoned). */
export async function deleteMeal(meal: SavedMeal): Promise<() => Promise<void>> {
  await deleteSynced(db.savedMeals, 'saved_meals', [meal.uuid])
  return async () => {
    await db.savedMeals.add({ uuid: crypto.randomUUID(), name: meal.name, items: meal.items, mealType: meal.mealType, updatedAt: Date.now(), syncPending: true })
    requestSync()
  }
}
