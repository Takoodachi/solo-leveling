import type { Exercise, WeightUnit, WorkoutSet } from '@/types'
import { formatKm, formatPace, INTENSITIES, intensityFromRpe } from '@/lib/cardio'
import { holdSeconds, isLb, shownWeight } from './units'
import { kindLabel } from './setKinds'

/**
 * A logged set as it reads in a list: "82.5×8", "12 reps", "1.5 min", a stretch's "30 s", or for cardio
 * "28 min · 5.2 km · 5:23 /km · Moderate". Weights read in `unit`; `labelLb` writes the unit out
 * for pounds ("185 lb×5"), for a list that mixes exercises logged in kg and in lb.
 */
export function describeSet(
  s: Pick<WorkoutSet, 'weight' | 'reps' | 'duration' | 'distanceKm' | 'rpe' | 'kind'>,
  exercise: Exercise,
  unit: WeightUnit,
  labelLb = false,
): string {
  const time = s.duration ? `${s.duration} min` : ''
  if (exercise.type === 'cardio') {
    const effort = s.rpe ? INTENSITIES.find(i => i.value === intensityFromRpe(s.rpe))?.label : ''
    return [time, s.distanceKm ? formatKm(s.distanceKm) : '', formatPace(exercise.uuid, s) ?? '', effort].filter(Boolean).join(' · ') || '—'
  }
  if (exercise.type === 'flexibility') return s.duration ? `${holdSeconds(s.duration)} s` : '—'
  const text = s.weight && s.reps
    ? `${shownWeight(s.weight, unit)}${labelLb && isLb(unit) ? ' lb' : ''}×${s.reps}`
    : s.reps ? `${s.reps} reps` : [time, s.distanceKm ? `${s.distanceKm} km` : ''].filter(Boolean).join(' · ') || '—'
  // A drop set, rest-pause or partials carrying the set before it on; F for a set taken to failure (setKinds.ts)
  if (s.kind) return `↳ ${text} ${kindLabel(s.kind).toLowerCase()}`
  return s.rpe === 10 ? `${text} F` : text
}
