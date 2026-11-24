import { db } from '@/db'
import { allSets, cached, exercisesById, workoutsById } from '@/db/read'
import { ROUTINE_TEMPLATES } from '@/data/routineTemplates'
import { setModeFor } from '@/lib/workoutMath'
import type { Exercise, Workout, WorkoutSet, WorkoutWithSets } from '@/types'
import { FLAT_SESSIONS, plateauOf, trendOf, type Plateau, type ProgressHint } from './progression'
import { pausedUntil } from './pause'
import { exerciseUnit } from './hooks/useExerciseNote'
import { pastSessions, sessionsFrom, type Session } from './hooks/useWorkoutHistory'

/**
 * A lift that has plateaued, told outside the workout (Home, and the summary right after one): the
 * same rule and the same lighter weight as the workout tip (`plateauOf` in progression.ts).
 */
export interface LiftPlateau extends Plateau {
  exerciseId: string
  name: string
  /** When its sessions without more reps began: which plateau it is, so a dismissed one stays dismissed. */
  since: number
}

/** Shown while the tips are (Settings → Workouts) and training isn't paused today. */
export async function showsPlateaus(today: string): Promise<boolean> {
  const settings = await db.settings.get(1)
  return settings?.workoutTips !== false && !(await pausedUntil(today))
}

/** Every lift's sessions as the tip reads them, for lifts with enough of them to have plateaued. */
const liftSessions = cached([db.workoutSets, db.workouts, db.exercises], async () => {
  const [sets, workoutOf, exerciseOf] = await Promise.all([allSets(), workoutsById(), exercisesById()])
  const byLift = new Map<string, WorkoutSet[]>()
  for (const s of sets) {
    const list = byLift.get(s.exerciseId)
    if (list) list.push(s)
    else byLift.set(s.exerciseId, [s])
  }
  return [...byLift].flatMap(([id, liftSets]) => {
    const exercise = exerciseOf.get(id)
    const sessions = exercise && setModeFor(exercise) === 'load' ? sessionsFrom(liftSets, workoutOf) : []
    return exercise && sessions.length >= FLAT_SESSIONS ? [{ exercise, sessions }] : []
  })
})

/** Home: every lift that has plateaued, by what's logged up to `now`. */
export async function liftPlateaus(now = Date.now()): Promise<LiftPlateau[]> {
  const [lifts, workoutOf, bodyKg] = await Promise.all([liftSessions(), workoutsById(), latestBodyKg()])
  const found = await Promise.all(lifts.map(({ exercise, sessions }) => plateauIn(exercise, sessions, now, workoutOf.get(sessions[0].workoutId), bodyKg)))
  return found.filter(p => p !== null)
}

/** The summary: the workout's lifts that have plateaued with it, so only once it makes enough sessions. */
export async function workoutPlateaus(workout: WorkoutWithSets): Promise<LiftPlateau[]> {
  const bodyKg = await latestBodyKg()
  const lifts = [...new Map(workout.sets.map(s => [s.exerciseId, s.exercise])).values()].filter(e => setModeFor(e) === 'load')
  const found = await Promise.all(lifts.map(async exercise =>
    // Its own session included (before just after it), and no gap since: the tip for the next session
    plateauIn(exercise, await pastSessions(exercise.uuid, workout.createdAt + 1), workout.createdAt, workout, bodyKg)))
  return found.filter(p => p !== null)
}

/** The summary's line under the lift, in the workout tip's own box. */
export const plateauHint = (p: LiftPlateau): ProgressHint => ({ kind: 'reset', title: `Next time, a reset at ${p.to} ${p.unit}`, why: plateauWhy([p]) })

/** Why, for one lift or a few (Home's card). */
export function plateauWhy(ps: LiftPlateau[]): string {
  const at = ps.length === 1 ? `${ps[0].sessions} sessions at ${ps[0].from} ${ps[0].unit}` : `Each has had ${Math.min(...ps.map(p => p.sessions))} or more sessions at its weight`
  return `${at} without more reps. Taking some weight off and building back up usually gets past a plateau.`
}

// shortcut: past 8 sessions (the most the tip reads) `since` moves with each one, so a dismissed plateau that long comes back; key it by more history if that matters
async function plateauIn(exercise: Exercise, sessions: Session[], now: number, last: Workout | undefined, bodyKg: number | undefined): Promise<LiftPlateau | null> {
  const trend = trendOf(sessions, now)
  if (!trend || trend.flat < FLAT_SESSIONS) return null // most lifts: nothing more to read
  const [targetReps, unit] = await Promise.all([planReps(last, exercise.uuid), exerciseUnit(exercise.uuid)])
  const plateau = plateauOf({ exercise, lastSets: sessions[0].sets, trend, targetReps, bodyKg, unit })
  return plateau && { ...plateau, exerciseId: exercise.uuid, name: exercise.name, since: sessions[plateau.sessions - 1].at }
}

/**
 * The reps the logger aims for on this lift, as it would next time: the routine its last workout came
 * from (a template has no id, only its name), whose target can turn a reset into a step up.
 */
async function planReps(last: Workout | undefined, exerciseId: string): Promise<number | undefined> {
  const plan = last?.routineId ? await db.routines.get(last.routineId) : ROUTINE_TEMPLATES.find(t => t.name === last?.name)
  return plan?.exercises.find(e => e.exerciseId === exerciseId)?.reps
}

const latestBodyKg = async () => (await db.bodyMetrics.orderBy('date').last())?.weightKg
