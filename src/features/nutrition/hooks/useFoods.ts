import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { Food, MealType } from '@/types'
import { requestSync, deleteSynced } from '@/lib/sync'
import { toast } from 'sonner'
import { today } from '@/lib/date'
import { updateStreak } from '@/lib/streak'
import { evaluateAchievements } from '@/lib/achievementEval'
import { checkDailyTargetsAndGrant } from '@/lib/dailyTargetXp'

/** Barcode foods use a stable id, so re-scanning a product finds (and can correct) the saved entry. */
export function barcodeFoodId(barcode: string): string {
  return `barcode-${barcode}`
}

/** Save a reviewed barcode scan. Values are per `amount` `unit` (one package serving, or 100 g/ml). */
export async function saveScannedFood(scan: {
  barcode: string
  name: string
  amount: number
  unit: 'g' | 'ml'
  kcal: number
  protein: number
  carbs: number
  fat: number
}): Promise<Food> {
  const uuid = barcodeFoodId(scan.barcode)
  const existing = await db.foods.get(uuid)
  const now = Date.now()
  const food: Food = {
    uuid,
    name: scan.name,
    kcalPerServing: scan.kcal,
    protein: scan.protein,
    carbs: scan.carbs,
    fat: scan.fat,
    servingSize: scan.amount,
    servingUnit: scan.unit,
    isCustom: true,
    isFavorite: existing?.isFavorite ?? false,
    notes: `Barcode ${scan.barcode}`,
    updatedAt: now,
    syncPending: true,
  }
  await db.transaction('rw', db.foods, db.foodLog, async () => {
    await db.foods.put(food)
    // Logs store a multiple of the serving size. If the serving changed (e.g. a
    // corrected "100 g" → "330 ml can"), rescale past logs so the amount eaten
    // stays the same and only the nutrition values are corrected.
    if (existing && existing.servingSize > 0 && existing.servingSize !== food.servingSize) {
      const ratio = existing.servingSize / food.servingSize
      const logs = await db.foodLog.where('foodId').equals(uuid).toArray()
      await db.foodLog.bulkPut(logs.map(l => ({ ...l, servings: Math.round(l.servings * ratio * 1000) / 1000, updatedAt: now, syncPending: true })))
    }
  })
  requestSync()
  return food
}

export function useFoods() {
  const foods = useLiveQuery(() => db.foods.orderBy('name').toArray(), [])
  // Booleans aren't indexable in IndexedDB, so filter instead of where().
  const favorites = useLiveQuery(() => db.foods.filter(f => f.isFavorite).toArray(), [])

  function searchFoods(query: string): Food[] {
    if (!foods) return []
    const q = query.toLowerCase().trim()
    if (!q) return foods
    return foods.filter(f => f.name.toLowerCase().includes(q))
  }

  async function toggleFavorite(foodUuid: string): Promise<void> {
    const food = await db.foods.get(foodUuid)
    if (!food) return
    await db.foods.update(foodUuid, {
      isFavorite: !food.isFavorite,
      updatedAt: Date.now(),
      syncPending: true,
    })
    requestSync()
  }

  async function addCustomFood(data: Omit<Food, 'uuid' | 'isCustom' | 'updatedAt' | 'syncPending'>): Promise<Food> {
    const food: Food = {
      ...data,
      uuid: crypto.randomUUID(),
      isCustom: true,
      updatedAt: Date.now(),
      syncPending: true,
    }
    await db.foods.add(food)
    requestSync()
    return food
  }

  async function addFoodLog(params: {
    date: string
    foodId: string
    servings: number
    mealType: MealType
  }): Promise<void> {
    await db.foodLog.add({
      uuid: crypto.randomUUID(),
      ...params,
      updatedAt: Date.now(),
      syncPending: true,
    })

    // Streak only updates when the user actually logged for today.
    if (params.date === today()) {
      await updateStreak()
      const hits = await checkDailyTargetsAndGrant(params.date)
      for (const label of hits) {
        toast.success(`Hit your daily ${label} — +XP`, { icon: '🎯' })
      }
    }

    const newAchievements = await evaluateAchievements()
    for (const ach of newAchievements) {
      toast.success(`Achievement unlocked: ${ach.title}`, { icon: ach.icon })
    }

    requestSync()
  }

  async function removeFoodLog(logUuid: string): Promise<void> {
    await deleteSynced(db.foodLog, 'food_log', [logUuid])
  }

  return {
    foods: foods ?? [],
    favorites: favorites ?? [],
    searchFoods,
    toggleFavorite,
    addCustomFood,
    addFoodLog,
    removeFoodLog,
  }
}
