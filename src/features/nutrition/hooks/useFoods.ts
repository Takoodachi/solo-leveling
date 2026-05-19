import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { Food } from '@/types'
import { syncService } from '@/lib/sync'
import { useAuthStore } from '@/features/auth/authStore'

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
