import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'

/** A day with food logged, and what it added up to. */
export interface FoodDay {
  date: string // yyyy-MM-dd
  kcal: number // eaten (steps aren't taken off here: this is what was logged)
  /** The foods' names, each once, in the order they were logged. */
  names: string[]
}

/** The days of a month ("yyyy-MM") with food logged, newest first. */
export function useFoodDays(month: string): FoodDay[] | undefined {
  return useLiveQuery(async () => {
    const logs = await db.foodLog.where('date').startsWith(month).sortBy('updatedAt')
    const foods = await db.foods.bulkGet([...new Set(logs.map(l => l.foodId))])
    const foodOf = new Map(foods.flatMap(f => (f ? [[f.uuid, f]] : [])))

    const days = new Map<string, FoodDay>()
    for (const log of logs) {
      const food = foodOf.get(log.foodId)
      if (!food) continue
      const day = days.get(log.date) ?? { date: log.date, kcal: 0, names: [] }
      day.kcal += food.kcalPerServing * log.servings
      if (!day.names.includes(food.name)) day.names.push(food.name)
      days.set(log.date, day)
    }
    return [...days.values()].sort((a, b) => b.date.localeCompare(a.date))
  }, [month])
}

/** The first day with food logged: `null` when there is none, `undefined` while it's being read. */
export function useFirstFoodDay(): string | null | undefined {
  return useLiveQuery(async () => (await db.foodLog.orderBy('date').first())?.date ?? null, [])
}
