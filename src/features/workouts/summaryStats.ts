import type { WorkoutWithSets } from '@/types'
import { formatVolume, totalReps, totalVolume } from '@/lib/workoutMath'
import { formatKm } from '@/lib/cardio'

/**
 * The figures at the top of a workout's summary as [label, value], for the card on screen and
 * the share image. Strength is measured in sets and volume; cardio in time and distance.
 * `shared` (the share image) leaves out the heart rate and the calorie estimate: the owner's call.
 */
export function summaryStats(workout: WorkoutWithSets, { shared = false } = {}): [string, string][] {
  const exerciseCount = new Set(workout.sets.map(s => s.exerciseId)).size
  const cardio = workout.sets.filter(s => s.exercise.type === 'cardio')
  const lifts = workout.sets.filter(s => s.exercise.type !== 'cardio')
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
    stats.push(['Sets finished:', `${lifts.length} sets`])
    stats.push(volume > 0 ? ['Volume:', formatVolume(volume)] : ['Total reps:', String(totalReps(lifts))])
  }
  if (cardio.length > 0) {
    stats.push(['Cardio time:', `${cardioMin} min`])
    if (km > 0) stats.push(['Distance:', formatKm(km)])
  }
  return stats
}
