import type { Food, FoodLog } from '@/types'

export interface MacroPoint {
  date: string
  proteinKcal: number
  carbsKcal: number
  fatKcal: number
  protein: number
  carbs: number
  fat: number
  totalKcal: number
}

export function macroAdherenceByDate(
  logs: FoodLog[],
  foods: Map<string, Food>,
  dates: string[], // ordered date strings to include (zero-fills missing days)
): MacroPoint[] {
  const byDate = new Map<string, MacroPoint>()
  for (const d of dates) {
    byDate.set(d, {
      date: d,
      proteinKcal: 0, carbsKcal: 0, fatKcal: 0,
      protein: 0, carbs: 0, fat: 0,
      totalKcal: 0,
    })
  }

  for (const log of logs) {
    const slot = byDate.get(log.date)
    if (!slot) continue
    const food = foods.get(log.foodId)
    if (!food) continue
    const m = log.servings
    slot.protein += food.protein * m
    slot.carbs   += food.carbs   * m
    slot.fat     += food.fat     * m
    slot.totalKcal += food.kcalPerServing * m
  }

  for (const slot of byDate.values()) {
    slot.proteinKcal = Math.round(slot.protein * 4)
    slot.carbsKcal   = Math.round(slot.carbs   * 4)
    slot.fatKcal     = Math.round(slot.fat     * 9)
    slot.protein   = Math.round(slot.protein * 10) / 10
    slot.carbs     = Math.round(slot.carbs   * 10) / 10
    slot.fat       = Math.round(slot.fat     * 10) / 10
    slot.totalKcal = Math.round(slot.totalKcal)
  }

  return dates.map(d => byDate.get(d)!).filter(Boolean)
}

export function lastNDates(n: number, todayIso: string): string[] {
  const dates: string[] = []
  const today = new Date(`${todayIso}T00:00:00`)
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}
