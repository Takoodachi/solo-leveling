import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { FoodLogWithFood, DailyNutrition, MealType } from '@/types'

export function useDailyLog(date: string) {
  const data = useLiveQuery(async () => {
    const logs = await db.foodLog.where('date').equals(date).toArray()
    if (logs.length === 0) return { logs: [], byMeal: emptyByMeal(), totals: zeroDailyNutrition() }

    const foodIds = [...new Set(logs.map(l => l.foodId))]
    const foods = await db.foods.bulkGet(foodIds)
    const foodMap = new Map(foods.flatMap(f => f ? [[f.uuid, f]] : []))

    const enriched: FoodLogWithFood[] = logs.map(log => ({
      ...log,
      food: foodMap.get(log.foodId)!,
    })).filter(l => l.food)

    const byMeal: Record<MealType, FoodLogWithFood[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    }
    for (const entry of enriched) {
      byMeal[entry.mealType].push(entry)
    }

    const totals = enriched.reduce<DailyNutrition>((acc, entry) => {
      const multiplier = entry.servings
      return {
        kcal:    acc.kcal    + entry.food.kcalPerServing * multiplier,
        protein: acc.protein + entry.food.protein       * multiplier,
        carbs:   acc.carbs   + entry.food.carbs         * multiplier,
        fat:     acc.fat     + entry.food.fat           * multiplier,
      }
    }, zeroDailyNutrition())

    return { logs: enriched, byMeal, totals }
  }, [date])

  return data ?? { logs: [], byMeal: emptyByMeal(), totals: zeroDailyNutrition() }
}

function emptyByMeal(): Record<MealType, FoodLogWithFood[]> {
  return { breakfast: [], lunch: [], dinner: [], snack: [] }
}

function zeroDailyNutrition(): DailyNutrition {
  return { kcal: 0, protein: 0, carbs: 0, fat: 0 }
}

export function calcMealNutrition(entries: FoodLogWithFood[]): DailyNutrition {
  return entries.reduce<DailyNutrition>((acc, entry) => ({
    kcal:    acc.kcal    + entry.food.kcalPerServing * entry.servings,
    protein: acc.protein + entry.food.protein       * entry.servings,
    carbs:   acc.carbs   + entry.food.carbs         * entry.servings,
    fat:     acc.fat     + entry.food.fat           * entry.servings,
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 })
}
