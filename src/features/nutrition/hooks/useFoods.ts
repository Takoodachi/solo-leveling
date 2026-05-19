import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { Food } from '@/types'
import { syncService } from '@/lib/sync'
import { useAuthStore } from '@/features/auth/authStore'
import { toast } from 'sonner'

export function useFoods() {
  const foods = useLiveQuery(() => db.foods.orderBy('name').toArray(), [])
  const favorites = useLiveQuery(
    () => db.foods.where('isFavorite').equals(1).toArray(),
    []
  )

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
    const userId = useAuthStore.getState().userId
    if (userId) void syncService.sync(userId)
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
    const userId = useAuthStore.getState().userId
    if (userId) void syncService.sync(userId)
    return food
  }

  async function addFoodLog(params: {
    date: string
    foodId: string
    servings: number
    mealType: import('@/types').MealType
  }): Promise<void> {
    await db.foodLog.add({
      uuid: crypto.randomUUID(),
      ...params,
      updatedAt: Date.now(),
      syncPending: true,
    })
    const userId = useAuthStore.getState().userId
    if (userId) void syncService.sync(userId)
  }

  async function removeFoodLog(logUuid: string): Promise<void> {
    await db.foodLog.delete(logUuid)
    const userId = useAuthStore.getState().userId
    if (userId) void syncService.sync(userId)
  }

  async function addBarcodeFood(barcode: string): Promise<Food | null> {
    // Check if we already have this food (by barcode stored in uuid prefix)
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
      const food: Food = {
        uuid: existingKey,
        name: String(name),
        kcalPerServing: Math.round(n['energy-kcal_100g'] ?? n['energy_100g'] ?? 0 / 4.184),
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
