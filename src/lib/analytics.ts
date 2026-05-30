import type { Workout, WorkoutSet, Food, FoodLog } from '@/types'

function epley1RM(weight: number, reps: number): number {
  return weight * (1 + reps / 30)
}

export interface VolumePoint {
  date: string
  volume: number
}

export interface OneRmPoint {
  date: string
  est1RM: number
  topWeight: number
  topReps: number
}

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

function workoutDateMap(workouts: Workout[]): Map<string, string> {
  const m = new Map<string, string>()
  for (const w of workouts) m.set(w.uuid, w.date)
  return m
}

export function volumeLoadByDate(
  sets: WorkoutSet[],
  workouts: Workout[],
  exerciseId: string,
): VolumePoint[] {
  const dateByWorkoutId = workoutDateMap(workouts)
  const byDate = new Map<string, number>()

  for (const s of sets) {
    if (s.exerciseId !== exerciseId) continue
    if (s.weight == null || s.reps == null) continue
    const date = dateByWorkoutId.get(s.workoutId)
    if (!date) continue
    byDate.set(date, (byDate.get(date) ?? 0) + s.weight * s.reps)
  }

  return [...byDate.entries()]
    .map(([date, volume]) => ({ date, volume: Math.round(volume) }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function oneRmByDate(
  sets: WorkoutSet[],
  workouts: Workout[],
  exerciseId: string,
): OneRmPoint[] {
  const dateByWorkoutId = workoutDateMap(workouts)
  const byDate = new Map<string, OneRmPoint>()

  for (const s of sets) {
    if (s.exerciseId !== exerciseId) continue
    if (s.weight == null || s.reps == null || s.weight <= 0 || s.reps <= 0) continue
    const date = dateByWorkoutId.get(s.workoutId)
    if (!date) continue
    const est = epley1RM(s.weight, s.reps)
    const current = byDate.get(date)
    if (!current || est > current.est1RM) {
      byDate.set(date, {
        date,
        est1RM: Math.round(est * 10) / 10,
        topWeight: s.weight,
        topReps: s.reps,
      })
    }
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
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
