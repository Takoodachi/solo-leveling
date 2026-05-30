import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { today } from '@/lib/date'
import {
  volumeLoadByDate, oneRmByDate, macroAdherenceByDate, lastNDates,
  type VolumePoint, type OneRmPoint, type MacroPoint,
} from '@/lib/analytics'
import { computeDynamicTargets } from '@/lib/macroTargets'
import { subDays, format, parseISO } from 'date-fns'
import type { Exercise } from '@/types'

function daysAgoIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

export type StrengthRange = 30 | 90 | 180 | 0 // 0 = all-time

interface StrengthResult {
  volume: VolumePoint[]
  oneRm: OneRmPoint[]
  hasData: boolean
}

export function useStrengthAnalytics(exerciseId: string | null, range: StrengthRange): StrengthResult {
  const data = useLiveQuery(async () => {
    if (!exerciseId) return { volume: [], oneRm: [], hasData: false }

    const sinceIso = range === 0 ? '0000-00-00' : daysAgoIso(range)
    const [allSets, allWorkouts] = await Promise.all([
      db.workoutSets.where('exerciseId').equals(exerciseId).toArray(),
      db.workouts.where('date').aboveOrEqual(sinceIso).toArray(),
    ])

    const inRangeWorkoutIds = new Set(allWorkouts.map(w => w.uuid))
    const setsInRange = allSets.filter(s => inRangeWorkoutIds.has(s.workoutId))

    return {
      volume: volumeLoadByDate(setsInRange, allWorkouts, exerciseId),
      oneRm:  oneRmByDate(setsInRange, allWorkouts, exerciseId),
      hasData: setsInRange.length > 0,
    }
  }, [exerciseId, range])

  return data ?? { volume: [], oneRm: [], hasData: false }
}

interface MacroResult {
  rows: MacroPoint[]
  targetKcal: number
  hasData: boolean
}

export function useMacroAdherence(rangeDays: number): MacroResult {
  const data = useLiveQuery(async () => {
    const dates = lastNDates(rangeDays, today())
    const earliest = dates[0]
    const logs = await db.foodLog.where('date').aboveOrEqual(earliest).toArray()
    const foodIds = [...new Set(logs.map(l => l.foodId))]
    const foods = await db.foods.bulkGet(foodIds)
    const foodMap = new Map(foods.flatMap(f => (f ? [[f.uuid, f]] : [])))

    const baseline = await db.targets.get(1)
    const settings = await db.settings.get(1)
    let targetKcal = baseline?.dailyKcal ?? 2000

    if (baseline && settings?.dynamicTargetsEnabled) {
      const windowDays = settings.activityWindowDays ?? 7
      const todayDate = parseISO(today())
      const windowDates = Array.from({ length: windowDays }, (_, i) =>
        format(subDays(todayDate, i + 1), 'yyyy-MM-dd'),
      )
      const windowEarliest = windowDates[windowDates.length - 1]
      const [activity, workouts, latestWeight] = await Promise.all([
        db.dailyActivity.where('date').aboveOrEqual(windowEarliest).toArray(),
        db.workouts.where('date').aboveOrEqual(windowEarliest).toArray(),
        db.bodyMetrics.orderBy('date').reverse().first(),
      ])
      const dyn = computeDynamicTargets({
        baseline,
        windowDays,
        bodyKg: latestWeight?.weightKg,
        dailyActivity: activity,
        workouts,
        windowDates,
      })
      targetKcal = dyn.targets.kcal
    }

    const rows = macroAdherenceByDate(logs, foodMap, dates)
    return {
      rows,
      targetKcal,
      hasData: logs.length > 0,
    }
  }, [rangeDays])

  return data ?? { rows: [], targetKcal: 2000, hasData: false }
}

export interface TrainedExercise {
  exercise: Exercise
  lastDate: string
  totalSets: number
}

export function useTrainedExercises(): TrainedExercise[] {
  const data = useLiveQuery(async () => {
    const sets = await db.workoutSets.toArray()
    if (sets.length === 0) return []

    const workoutIds = [...new Set(sets.map(s => s.workoutId))]
    const workouts = await db.workouts.bulkGet(workoutIds)
    const dateByWorkout = new Map(workouts.flatMap(w => (w ? [[w.uuid, w.date]] : [])))

    const stats = new Map<string, { lastDate: string; count: number }>()
    for (const s of sets) {
      const date = dateByWorkout.get(s.workoutId)
      if (!date) continue
      const cur = stats.get(s.exerciseId)
      if (!cur) {
        stats.set(s.exerciseId, { lastDate: date, count: 1 })
      } else {
        cur.count += 1
        if (date > cur.lastDate) cur.lastDate = date
      }
    }

    const exerciseIds = [...stats.keys()]
    const exercises = await db.exercises.bulkGet(exerciseIds)
    const out: TrainedExercise[] = []
    for (const ex of exercises) {
      if (!ex) continue
      const s = stats.get(ex.uuid)!
      out.push({ exercise: ex, lastDate: s.lastDate, totalSets: s.count })
    }
    out.sort((a, b) => b.lastDate.localeCompare(a.lastDate))
    return out
  }, [])

  return data ?? []
}
