import { useLiveQuery } from 'dexie-react-hooks'
import { toast } from 'sonner'
import { db } from '@/db'
import type { Food } from '@/types'
import { requestSync } from '@/lib/sync'
import { normalize } from '@/lib/search'
import { logFoods, type NewFoodLog } from '../logFoods'
import type { ReviewedFood } from '../openFoodFacts'
import { isQuickAdd } from '../foodAmount'

/** Barcode foods use a stable id, so re-scanning a product finds (and can correct) the saved entry. */
export function barcodeFoodId(barcode: string): string {
  return `barcode-${barcode}`
}

/** Save a reviewed product (scanned, or found by name). */
export async function saveScannedFood(scan: ReviewedFood): Promise<Food> {
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

/**
 * Take a custom food off every list, with an Undo. The row stays, flagged: every total is
 * worked out from the food behind each log, so deleting it would empty the days it was eaten on.
 * (Scanning a removed product again saves it afresh, which brings it back.)
 */
export async function removeCustomFood(food: Food): Promise<void> {
  const set = (removed: boolean) => db.foods.update(food.uuid, { removed, updatedAt: Date.now(), syncPending: true }).then(() => requestSync())
  await set(true)
  toast(`Removed ${food.name}`, { action: { label: 'Undo', onClick: () => void set(false) } })
}

export function useFoods() {
  // Foods to pick from: a removed one is only still there for the days it was logged on
  const foods = useLiveQuery(() => db.foods.orderBy('name').filter(f => !f.removed).toArray(), [])
  // Booleans aren't indexable in IndexedDB, so filter instead of where().
  const favorites = useLiveQuery(() => db.foods.filter(f => f.isFavorite && !f.removed).toArray(), [])

  /** Every word must match; accents don't matter, so "pho bo" finds "Phở bò". */
  function searchFoods(query: string): Food[] {
    if (!foods) return []
    // Quick add isn't a food to pick: it has its own button
    const listed = foods.filter(f => !isQuickAdd(f))
    const words = normalize(query).split(/\s+/).filter(Boolean)
    if (words.length === 0) return listed
    return listed.filter(f => {
      const name = normalize(f.name)
      return words.every(w => name.includes(w))
    })
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

  /** Log one food; returns the new log id (for undo). */
  async function addFoodLog(params: NewFoodLog): Promise<string> {
    const [uuid] = await logFoods([params])
    return uuid
  }

  return {
    foods: foods ?? [],
    favorites: favorites ?? [],
    searchFoods,
    toggleFavorite,
    addCustomFood,
    addFoodLog,
  }
}
