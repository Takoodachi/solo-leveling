import type { WeightUnit, WorkoutWithSets } from '@/types'
import { formatVolume, totalReps, totalVolume } from '@/lib/workoutMath'
import { formatClock, formatKm } from '@/lib/cardio'
import { kindLabel } from './setKinds'

/**
 * The figures at the top of a workout's summary as [label, value], for the card on screen and
 * the share image. Strength is measured in sets and volume; cardio in time and distance; stretches in holds and time.
 * `shared` (the share image) leaves out the heart rate and the calorie estimate: the owner's call.
 */
export function summaryStats(workout: WorkoutWithSets, unit: WeightUnit, { shared = false } = {}): [string, string][] {
  const exerciseCount = new Set(workout.sets.map(s => s.exerciseId)).size
  const cardio = workout.sets.filter(s => s.exercise.type === 'cardio')
  const stretches = workout.sets.filter(s => s.exercise.type === 'flexibility')
  const lifts = workout.sets.filter(s => s.exercise.type !== 'cardio' && s.exercise.type !== 'flexibility')
  const volume = totalVolume(lifts)
  const cardioMin = Math.round(cardio.reduce((sum, s) => sum + (s.duration ?? 0), 0))
  const km = cardio.reduce((sum, s) => sum + (s.distanceKm ?? 0), 0)

  const stats: [string, string][] = [['Duration:', `${workout.durationMin} min`]]
  if (!shared) {
    stats.push(['Calories burned (est.):', workout.kcalEst ? `${workout.kcalEst} kcal` : '—'])
    stats.push(['Avg. heart rate:', workout.avgHeartRate ? `${workout.avgHeartRate} BPM` : 'Not recorded'])
  }
  stats.push(['Exercises:', String(exerciseCount)])
  if (lifts.length > 0) {
    stats.push(['Sets finished:', setsFinished(lifts)])
    stats.push(volume > 0 ? ['Volume:', formatVolume(volume, unit)] : ['Total reps:', String(totalReps(lifts))])
  }
  if (stretches.length > 0) {
    const minutes = stretches.reduce((sum, s) => sum + (s.duration ?? 0), 0)
    stats.push(['Stretches held:', `${stretches.length} · ${formatClock(minutes)}`]) // "12 · 6:30"
  }
  if (cardio.length > 0) {
    stats.push(['Cardio time:', `${cardioMin} min`])
    if (km > 0) stats.push(['Distance:', formatKm(km)])
  }
  return stats
}

/** "4 sets", or with what carried them on: "4 sets + 2 drop sets", "4 sets + 3 more" for a mix (setKinds.ts). */
function setsFinished(lifts: WorkoutWithSets['sets']): string {
  const extra = lifts.filter(s => s.kind)
  const main = `${lifts.length - extra.length} sets`
  if (extra.length === 0) return main
  const kinds = new Set(extra.map(s => s.kind))
  const only = kinds.size === 1 ? extra[0].kind : null
  const what = only === 'drop' ? (extra.length === 1 ? 'drop set' : 'drop sets') : only ? kindLabel(only).toLowerCase() : 'more'
  return `${main} + ${extra.length} ${what}`
}
