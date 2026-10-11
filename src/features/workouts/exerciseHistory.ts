import { format, parseISO } from 'date-fns'
import { db } from '@/db'
import type { Exercise, WeightUnit, Workout, WorkoutSet } from '@/types'
import { formatKm, formatSpeed, paceStyle, speedKmh } from '@/lib/cardio'
import { est1RM } from '@/lib/workoutMath'
import { describeSet } from './describeSet'
import { exerciseUnit } from './hooks/useExerciseNote'
import { fromKg } from './units'

/** How many past sessions the info sheet lists. */
const SESSIONS_SHOWN = 5

export interface HistorySession {
  workoutId: string
  /** "Fri 9 Oct", with the year once it isn't this one. */
  day: string
  /** Its sets in order, as they were logged ("82.5×8"). */
  sets: string[]
}

export interface HistoryBest {
  label: string
  value: string
  day: string
}

export interface ExerciseHistory {
  /** Every workout that had this exercise. */
  total: number
  /** The latest few, newest first. */
  sessions: HistorySession[]
  bests: HistoryBest[]
  /** The unit its weights read in (the one it's logged in). */
  unit: WeightUnit
}

type DatedSet = WorkoutSet & { date: string }

/** The set with the highest `score`, if any scores above zero. */
function top(sets: DatedSet[], score: (s: DatedSet) => number): DatedSet | undefined {
  let best: DatedSet | undefined
  for (const s of sets) if (score(s) > 0 && (!best || score(s) > score(best))) best = s
  return best
}

function bestsOf(sets: DatedSet[], exercise: Exercise, unit: WeightUnit, day: (date: string) => string): HistoryBest[] {
  const bests: HistoryBest[] = []
  const add = (label: string, set: DatedSet | undefined, value: (s: DatedSet) => string) => {
    if (set) bests.push({ label, value: value(set), day: day(set.date) })
  }

  if (exercise.type === 'cardio') {
    add('Longest', top(sets, s => s.distanceKm ?? 0), s => formatKm(s.distanceKm!))
    if (paceStyle(exercise.uuid)) {
      // Like the summary's bests: pace only counts over a real distance
      const minKm = paceStyle(exercise.uuid) === 'per-100m' ? 0.2 : 1
      add('Fastest', top(sets.filter(s => (s.distanceKm ?? 0) >= minKm), s => speedKmh(s) ?? 0), s => formatSpeed(exercise.uuid, speedKmh(s)!))
    }
    if (bests.length === 0) add('Longest', top(sets, s => s.duration ?? 0), s => `${s.duration} min`)
    return bests
  }

  const loaded = sets.filter(s => s.weight && s.reps)
  if (loaded.length > 0) {
    const w = (kg: number) => `${fromKg(kg, unit)} ${unit}`
    add('Best set', top(loaded, s => est1RM(s.weight!, s.reps!)), s => `${w(s.weight!)} × ${s.reps} · est. 1RM ${w(Math.round(est1RM(s.weight!, s.reps!) * 10) / 10)}`)
    add('Heaviest', top(loaded, s => s.weight! * 1000 + s.reps!), s => `${w(s.weight!)} × ${s.reps}`) // more reps wins a tie
    // The same set twice says nothing new
    if (bests.length === 2 && bests[1].value === bests[0].value.split(' · ')[0] && bests[1].day === bests[0].day) bests.pop()
    return bests
  }
  add('Most reps', top(sets, s => s.reps ?? 0), s => `${s.reps} reps`)
  if (bests.length === 0) add('Longest', top(sets, s => s.duration ?? 0), s => `${s.duration} min`)
  return bests
}

/** What the info sheet shows of an exercise's past: the latest sessions and the best it has seen. */
export async function exerciseHistory(exercise: Exercise): Promise<ExerciseHistory> {
  const unit = await exerciseUnit(exercise.uuid)
  const sets = await db.workoutSets.where('exerciseId').equals(exercise.uuid).toArray()
  const workouts = (await db.workouts.bulkGet([...new Set(sets.map(s => s.workoutId))]))
    .filter((w): w is Workout => !!w)
    .sort((a, b) => b.createdAt - a.createdAt)
  const dateOf = new Map(workouts.map(w => [w.uuid, w.date]))
  const thisYear = format(new Date(), 'yyyy')
  const day = (date: string) => format(parseISO(date), date.startsWith(thisYear) ? 'EEE d MMM' : 'd MMM yyyy')

  const dated = sets.flatMap(s => (dateOf.has(s.workoutId) ? [{ ...s, date: dateOf.get(s.workoutId)! }] : []))
  return {
    total: workouts.length,
    unit,
    bests: bestsOf(dated, exercise, unit, day),
    sessions: workouts.slice(0, SESSIONS_SHOWN).map(w => ({
      workoutId: w.uuid,
      day: day(w.date),
      sets: sets.filter(s => s.workoutId === w.uuid).sort((a, b) => a.setIndex - b.setIndex).map(s => describeSet(s, exercise, unit)),
    })),
  }
}
