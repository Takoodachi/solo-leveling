import { db } from '@/db'
import type { Exercise } from '@/types'
import type { ExerciseSuggestion } from '../types'

const RELATED_LOOKBACK_DAYS = 30
const SCALE_FACTOR = 0.7
const STEP_KG = 2.5
const DEFAULT_SUGGESTED_REPS = 8

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step
}

function daysAgoIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

async function topSetForExercise(exerciseId: string): Promise<
  { weight: number; reps?: number; workoutId: string; date: string } | null
> {
  // Find the user's most recent workout that included this exercise, then return its top-weight set.
  const sets = await db.workoutSets.where('exerciseId').equals(exerciseId).toArray()
  if (sets.length === 0) return null

  const workoutIds = [...new Set(sets.map(s => s.workoutId))]
  const workouts = await db.workouts.bulkGet(workoutIds)
  const workoutMap = new Map(workouts.flatMap(w => (w ? [[w.uuid, w]] : [])))

  let mostRecentWorkoutId: string | null = null
  let mostRecentCreatedAt = -Infinity
  for (const wid of workoutIds) {
    const w = workoutMap.get(wid)
    if (w && w.createdAt > mostRecentCreatedAt) {
      mostRecentCreatedAt = w.createdAt
      mostRecentWorkoutId = wid
    }
  }
  if (!mostRecentWorkoutId) return null

  const recentSets = sets.filter(s => s.workoutId === mostRecentWorkoutId)
  const top = recentSets.reduce<typeof recentSets[number] | null>((best, s) => {
    if (s.weight == null) return best
    if (!best || (s.weight ?? 0) > (best.weight ?? 0)) return s
    return best
  }, null)
  if (!top || top.weight == null) return null

  const w = workoutMap.get(mostRecentWorkoutId)!
  return { weight: top.weight, reps: top.reps, workoutId: mostRecentWorkoutId, date: w.date }
}

async function topRecentSetAcrossExercise(exerciseId: string, sinceDateIso: string): Promise<number | null> {
  const sets = await db.workoutSets.where('exerciseId').equals(exerciseId).toArray()
  if (sets.length === 0) return null

  const workoutIds = [...new Set(sets.map(s => s.workoutId))]
  const workouts = await db.workouts.bulkGet(workoutIds)
  const recentWorkoutIds = new Set(
    workouts.flatMap(w => (w && w.date >= sinceDateIso ? [w.uuid] : [])),
  )
  if (recentWorkoutIds.size === 0) return null

  let best = -Infinity
  for (const s of sets) {
    if (!recentWorkoutIds.has(s.workoutId)) continue
    if (s.weight != null && s.weight > best) best = s.weight
  }
  return best > -Infinity ? best : null
}

export async function suggestForExercise(exercise: Exercise): Promise<ExerciseSuggestion | null> {
  // 1) History path: have we done this exact exercise before?
  const top = await topSetForExercise(exercise.uuid)
  if (top) {
    return {
      source: 'history',
      weight: top.weight,
      reps: top.reps,
      lastDate: top.date,
    }
  }

  // 2) Related path: only for strength exercises with a known primary muscle.
  if (exercise.type !== 'strength') return null
  const primaryMuscle = exercise.muscles?.[0]
  if (!primaryMuscle) return null

  const candidates = await db.exercises
    .filter(e => e.uuid !== exercise.uuid && e.type === 'strength' && e.muscles?.[0] === primaryMuscle)
    .toArray()
  if (candidates.length === 0) return null

  const sinceDate = daysAgoIso(RELATED_LOOKBACK_DAYS)
  let bestCandidate: { exercise: Exercise; topWeight: number } | null = null
  for (const cand of candidates) {
    const top = await topRecentSetAcrossExercise(cand.uuid, sinceDate)
    if (top == null) continue
    if (!bestCandidate || top > bestCandidate.topWeight) {
      bestCandidate = { exercise: cand, topWeight: top }
    }
  }
  if (!bestCandidate) return null

  const scaled = roundToStep(bestCandidate.topWeight * SCALE_FACTOR, STEP_KG)
  if (scaled <= 0) return null

  return {
    source: 'related',
    weight: scaled,
    reps: DEFAULT_SUGGESTED_REPS,
    sourceExerciseName: bestCandidate.exercise.name,
  }
}
