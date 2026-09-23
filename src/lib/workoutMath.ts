import type { Exercise, RoutineCategory, RoutineExercise, WorkoutSet } from '@/types'
import { cardioKcal, cardioMet, type CardioEntry } from './cardio'

export const DEFAULT_BODY_KG = 70

export function resolveBodyKg(bodyKg: number | undefined): number {
  return bodyKg && bodyKg > 0 ? bodyKg : DEFAULT_BODY_KG
}

/**
 * How an exercise is logged: `load` = weight × reps sets, `time` = timed sets
 * (planks), `cardio` = one entry of time + distance + effort (never sets).
 */
export type SetMode = 'load' | 'time' | 'cardio'

export type ExerciseKind = Pick<Exercise, 'type' | 'defaultUnit'>

export function setModeFor(exercise: ExerciseKind): SetMode {
  if (exercise.type === 'cardio') return 'cardio'
  if (exercise.defaultUnit === 'min') return 'time'
  return 'load' // kg / lb / reps
}

/** Epley estimate of a one-rep max. */
export function est1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0
  return reps === 1 ? weight : weight * (1 + reps / 30)
}

export function setVolume(s: Pick<WorkoutSet, 'weight' | 'reps'>): number {
  return (s.weight ?? 0) * (s.reps ?? 0)
}

export function totalVolume(sets: Pick<WorkoutSet, 'weight' | 'reps'>[]): number {
  return sets.reduce((sum, s) => sum + setVolume(s), 0)
}

export function totalReps(sets: Pick<WorkoutSet, 'reps'>[]): number {
  return sets.reduce((sum, s) => sum + (s.reps ?? 0), 0)
}

// Rough MET values (Compendium of Physical Activities) — only used for an "est." kcal figure.
const MET: Record<RoutineCategory, number> = {
  strength: 5,
  'full-body': 5.5,
  cardio: 7,
  core: 3.8,
  mobility: 2.5,
}

const LIGHT_MET = 3

export function metFor(category: RoutineCategory): number {
  return MET[category]
}

/** Estimated active kcal: MET × body weight (kg) × hours. */
export function estimateKcal(met: number, bodyKg: number | undefined, minutes: number): number {
  return Math.round(met * resolveBodyKg(bodyKg) * (minutes / 60))
}

/**
 * MET for the non-cardio part of a finished workout: the routine's category
 * rate, strength work if any lifts were done, else light activity (warm-up, rests).
 */
export function liftMetFor(category: RoutineCategory | undefined, exercises: ExerciseKind[]): number {
  if (category && category !== 'cardio') return MET[category]
  return exercises.some(e => setModeFor(e) !== 'cardio') ? MET.strength : LIGHT_MET
}

const WORK_SECONDS_PER_SET = 40

/**
 * Minutes one routine exercise takes. Cardio: its target minutes (`reps`).
 * Timed sets: sets × (hold + rest). Load sets: sets × (~40 s work + rest).
 */
export function exerciseMinutes(re: RoutineExercise, exercise?: ExerciseKind): number {
  const mode = exercise ? setModeFor(exercise) : 'load'
  if (mode === 'cardio') return re.sets * re.reps + (Math.max(0, re.sets - 1) * re.restSec) / 60
  const workSec = mode === 'time' ? re.reps * 60 : WORK_SECONDS_PER_SET
  return (re.sets * (workSec + re.restSec)) / 60
}

export function routineMinutes(exercises: RoutineExercise[], lookup: (id: string) => ExerciseKind | undefined): number {
  const total = exercises.reduce((sum, re) => sum + exerciseMinutes(re, lookup(re.exerciseId)), 0)
  return Math.max(5, Math.round(total / 5) * 5)
}

/** Time-weighted MET of a routine: cardio at moderate effort, everything else at the category's rate. */
export function routineMet(
  exercises: RoutineExercise[],
  lookup: (id: string) => ExerciseKind | undefined,
  category: RoutineCategory,
): number {
  const liftMet = category === 'cardio' ? MET.strength : MET[category]
  let minutes = 0
  let weighted = 0
  for (const re of exercises) {
    const ex = lookup(re.exerciseId)
    const m = exerciseMinutes(re, ex)
    const met = ex && setModeFor(ex) === 'cardio' ? cardioMet(re.exerciseId, { duration: re.reps }) : liftMet
    minutes += m
    weighted += met * m
  }
  return minutes > 0 ? weighted / minutes : MET[category]
}

/**
 * Finished workout: each cardio entry by its own MET (speed or effort), the
 * rest of the session at the lifting rate.
 */
export function estimateWorkoutKcal(opts: {
  durationMin: number
  bodyKg: number | undefined
  liftMet: number
  cardio: (CardioEntry & { exerciseId: string })[]
}): number {
  const kg = resolveBodyKg(opts.bodyKg)
  const cardioMin = opts.cardio.reduce((sum, c) => sum + (c.duration ?? 0), 0)
  const cardio = opts.cardio.reduce((sum, c) => sum + cardioKcal(c.exerciseId, c, kg), 0)
  const rest = Math.max(0, opts.durationMin - cardioMin)
  return Math.round(cardio + opts.liftMet * kg * (rest / 60))
}

export function formatVolume(kg: number): string {
  if (kg >= 10000) return `${(kg / 1000).toFixed(1)}t`
  return `${Math.round(kg).toLocaleString()} kg`
}
