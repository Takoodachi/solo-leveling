import type { Exercise, RoutineCategory, RoutineExercise, WorkoutSet } from '@/types'

export const DEFAULT_BODY_KG = 70

/** How a set is logged for an exercise. */
export type SetMode = 'load' | 'time' | 'distance'

export function setModeFor(exercise: Pick<Exercise, 'defaultUnit'>): SetMode {
  if (exercise.defaultUnit === 'min') return 'time'
  if (exercise.defaultUnit === 'km') return 'distance'
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

export function metFor(category: RoutineCategory): number {
  return MET[category]
}

/** Estimated active kcal: MET × body weight (kg) × hours. */
export function estimateKcal(met: number, bodyKg: number | undefined, minutes: number): number {
  const kg = bodyKg && bodyKg > 0 ? bodyKg : DEFAULT_BODY_KG
  return Math.round(met * kg * (minutes / 60))
}

/** MET for a finished workout, inferred from its exercises. */
export function metForExercises(exercises: Pick<Exercise, 'type'>[]): number {
  if (exercises.length === 0) return MET.strength
  const cardio = exercises.filter(e => e.type === 'cardio').length
  return cardio / exercises.length > 0.5 ? MET.cardio : MET.strength
}

const WORK_SECONDS_PER_SET = 40

/** Minutes one routine exercise takes: sets × (work + rest). Time-based targets count as minutes. */
export function exerciseMinutes(re: RoutineExercise, exercise?: Pick<Exercise, 'defaultUnit'>): number {
  const workSec = exercise && setModeFor(exercise) === 'time' ? re.reps * 60 : WORK_SECONDS_PER_SET
  return (re.sets * (workSec + re.restSec)) / 60
}

export function routineMinutes(
  exercises: RoutineExercise[],
  lookup: (id: string) => Pick<Exercise, 'defaultUnit'> | undefined,
): number {
  const total = exercises.reduce((sum, re) => sum + exerciseMinutes(re, lookup(re.exerciseId)), 0)
  return Math.max(5, Math.round(total / 5) * 5)
}

export function formatVolume(kg: number): string {
  if (kg >= 10000) return `${(kg / 1000).toFixed(1)}t`
  return `${Math.round(kg).toLocaleString()} kg`
}
