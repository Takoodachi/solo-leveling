import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { Food, MealType } from '@/types'
import { requestSync, deleteSynced } from '@/lib/sync'
import { toast } from 'sonner'
import { today } from '@/lib/date'
import { updateStreak } from '@/lib/streak'
import { evaluateAchievements } from '@/lib/achievementEval'
import { checkDailyTargetsAndGrant } from '@/lib/dailyTargetXp'

const KJ_PER_KCAL = 4.184

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

  async function addBarcodeFood(barcode: string): Promise<Food | null> {
    // Barcode foods use a stable id so re-scanning the same product reuses it.
    const existingKey = `barcode-${barcode}`
    const existing = await db.foods.get(existingKey)
    if (existing) return existing

    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
      const json = await res.json() as { status: number; product?: Record<string, unknown> }
      if (json.status !== 1 || !json.product) {
        toast.error('Product not found — add it manually')
        return null
      }
      const p = json.product
      const n = p.nutriments as Record<string, number> | undefined ?? {}
      const name = (p.product_name as string | undefined) || (p.generic_name as string | undefined) || 'Unknown product'
      // Prefer the kcal field; fall back to converting the kJ energy value.
      const kcal = n['energy-kcal_100g'] ?? (n['energy_100g'] != null ? n['energy_100g'] / KJ_PER_KCAL : 0)
      const food: Food = {
        uuid: existingKey,
        name: String(name),
        kcalPerServing: Math.round(kcal),
        protein: Math.round((n['proteins_100g'] ?? 0) * 10) / 10,
        carbs: Math.round((n['carbohydrates_100g'] ?? 0) * 10) / 10,
        fat: Math.round((n['fat_100g'] ?? 0) * 10) / 10,
        servingSize: 100,
        servingUnit: 'g',
        isCustom: true,
        isFavorite: false,
        updatedAt: Date.now(),
        syncPending: true,
      }
      await db.foods.put(food)
      requestSync()
      toast.success(`Found: ${food.name}`)
      return food
    } catch {
      toast.error('Could not look up barcode — check your connection')
      return null
    }
  }

  return {
    foods: foods ?? [],
    favorites: favorites ?? [],
    searchFoods,
    toggleFavorite,
    addCustomFood,
    addBarcodeFood,
    addFoodLog,
    removeFoodLog,
  }
}
