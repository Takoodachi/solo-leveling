import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { foodsById, setsOfWorkouts } from '@/db/read'
import { setVolume } from '@/lib/workoutMath'

export interface DaySummary {
  date: string
  workouts: number
  workoutIds: string[]
  volume: number
  activeMin: number
  kcal: number
  protein: number
  steps: number
  foodLogged: boolean
}

/** Per-day totals (training, food, steps) for the given YYYY-MM-DD dates, in order. */
export function useWeekSummary(dates: string[]): DaySummary[] | undefined {
  const key = dates.join(',') // stable dependency: callers pass a fresh array each render
  return useLiveQuery(() => daySummaries(dates), [key])
}

/** The same totals outside React (the Android widgets, features/widgets). */
export async function daySummaries(dates: string[]): Promise<DaySummary[]> {
  if (dates.length === 0) return []
  const first = dates[0]
  const last = dates[dates.length - 1]

  const [workouts, logs, activity] = await Promise.all([
    db.workouts.where('date').between(first, last, true, true).toArray(),
    db.foodLog.where('date').between(first, last, true, true).toArray(),
    db.dailyActivity.where('date').between(first, last, true, true).toArray(),
  ])
  const [sets, foodMap] = await Promise.all([setsOfWorkouts(workouts.map(w => w.uuid)), foodsById()])
  const workoutDate = new Map(workouts.map(w => [w.uuid, w.date]))

  const byDate = new Map<string, DaySummary>(dates.map(d => [d, {
    date: d, workouts: 0, workoutIds: [], volume: 0, activeMin: 0, kcal: 0, protein: 0, steps: 0, foodLogged: false,
  }]))

  for (const w of workouts) {
    const day = byDate.get(w.date)
    if (!day) continue
    day.workouts += 1
    day.workoutIds.push(w.uuid)
    day.activeMin += w.durationMin
  }
  for (const s of sets) {
    const day = byDate.get(workoutDate.get(s.workoutId) ?? '')
    if (day) day.volume += setVolume(s)
  }
  for (const l of logs) {
    const day = byDate.get(l.date)
    const food = foodMap.get(l.foodId)
    if (!day || !food) continue
    day.foodLogged = true
    day.kcal += food.kcalPerServing * l.servings
    day.protein += food.protein * l.servings
  }
  for (const a of activity) {
    const day = byDate.get(a.date)
    if (day) day.steps = Math.max(day.steps, a.steps)
  }
  return dates.map(d => byDate.get(d)!)
}
