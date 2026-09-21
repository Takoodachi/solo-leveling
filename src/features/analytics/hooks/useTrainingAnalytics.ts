import { useLiveQuery } from 'dexie-react-hooks'
import { format, startOfWeek, subWeeks, parseISO } from 'date-fns'
import { db } from '@/db'
import type { Exercise } from '@/types'
import { est1RM, setVolume } from '@/lib/workoutMath'
import { lastNDays, toDateStr } from '@/lib/date'

export interface WeekVolume {
  label: string
  volume: number
  workouts: number
}

/** Training volume and workout count per week (Mon-start), oldest first. */
export function useWeeklyVolume(weeks: number): WeekVolume[] | undefined {
  return useLiveQuery(async () => {
    const thisWeek = startOfWeek(new Date(), { weekStartsOn: 1 })
    const starts = Array.from({ length: weeks }, (_, i) => subWeeks(thisWeek, weeks - 1 - i))
    const from = toDateStr(starts[0])
    const workouts = await db.workouts.where('date').aboveOrEqual(from).toArray()
    const sets = workouts.length ? await db.workoutSets.where('workoutId').anyOf(workouts.map(w => w.uuid)).toArray() : []
    const weekOf = (date: string) => toDateStr(startOfWeek(parseISO(date), { weekStartsOn: 1 }))
    const workoutWeek = new Map(workouts.map(w => [w.uuid, weekOf(w.date)]))

    const buckets = new Map(starts.map(s => [toDateStr(s), { label: format(s, 'MMM d'), volume: 0, workouts: 0 }]))
    for (const w of workouts) {
      const b = buckets.get(weekOf(w.date))
      if (b) b.workouts += 1
    }
    for (const s of sets) {
      const b = buckets.get(workoutWeek.get(s.workoutId) ?? '')
      if (b) b.volume += setVolume(s)
    }
    return [...buckets.values()].map(b => ({ ...b, volume: Math.round(b.volume) }))
  }, [weeks])
}

/** Exercises that have weighted sets logged, most-trained first. */
export function useLiftedExercises(): { exercise: Exercise; sessions: number }[] | undefined {
  return useLiveQuery(async () => {
    const sets = await db.workoutSets.filter(s => !!s.weight && !!s.reps).toArray()
    const sessions = new Map<string, Set<string>>()
    for (const s of sets) sessions.set(s.exerciseId, (sessions.get(s.exerciseId) ?? new Set()).add(s.workoutId))
    const exercises = await db.exercises.bulkGet([...sessions.keys()])
    return exercises
      .flatMap(e => (e ? [{ exercise: e, sessions: sessions.get(e.uuid)!.size }] : []))
      .sort((a, b) => b.sessions - a.sessions)
  }, [])
}

export interface OneRmPoint {
  date: string
  est1RM: number
  topWeight: number
  topReps: number
}

/** Best estimated 1RM per workout for one exercise, oldest first. */
export function useOneRmHistory(exerciseId: string | undefined): OneRmPoint[] | undefined {
  return useLiveQuery(async () => {
    if (!exerciseId) return []
    const sets = await db.workoutSets.where('exerciseId').equals(exerciseId).toArray()
    const workouts = await db.workouts.bulkGet([...new Set(sets.map(s => s.workoutId))])
    const dateOf = new Map(workouts.flatMap(w => (w ? [[w.uuid, w.date]] : [])))
    const best = new Map<string, OneRmPoint>()
    for (const s of sets) {
      const date = dateOf.get(s.workoutId)
      if (!date || !s.weight || !s.reps) continue
      const e = est1RM(s.weight, s.reps)
      const cur = best.get(date)
      if (!cur || e > cur.est1RM) best.set(date, { date, est1RM: Math.round(e * 10) / 10, topWeight: s.weight, topReps: s.reps })
    }
    return [...best.values()].sort((a, b) => a.date.localeCompare(b.date))
  }, [exerciseId])
}

/** Steps per day for the last `days` days (0 when not logged). */
export function useStepsHistory(days: number): { date: string; steps: number }[] | undefined {
  return useLiveQuery(async () => {
    const dates = lastNDays(days)
    const rows = await db.dailyActivity.where('date').aboveOrEqual(dates[0]).toArray()
    const byDate = new Map(rows.map(r => [r.date, r.steps]))
    return dates.map(date => ({ date, steps: byDate.get(date) ?? 0 }))
  }, [days])
}
