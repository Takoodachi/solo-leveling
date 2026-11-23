import { useNavigate } from 'react-router-dom'
import { differenceInCalendarDays } from 'date-fns'
import { toast } from 'sonner'
import { db } from '@/db'
import type { WorkoutSet } from '@/types'
import { deleteSynced, requestSync } from '@/lib/sync'
import { parseDate } from '@/lib/date'
import { evaluateAchievements } from '@/lib/achievementEval'
import { announceAchievements } from '@/features/gamification/announce'
import { estimateWorkoutKcal, liftMetFor, liftMetFromHeartRate, setModeFor } from '@/lib/workoutMath'
import { intensityFromRpe, rpeFor } from '@/lib/cardio'
import { DEFAULT_REST_SECONDS } from '@/features/settings/hooks/useSettings'
import { useWorkoutStore } from '../store'
import { emptySet, parsePositive, type BlockDraft, numText } from '../types'
import { durationOf, holdText, weightKg, weightText } from '../units'
import { effortFromRpe, liftRpe, type Effort } from '../effort'
import { lastMain } from '../setKinds'
import { exerciseUnit } from './useExerciseNote'
import { getWorkoutWithSets, lastSessionSets, readWorkoutAhead } from './useWorkoutHistory'
import type { FinishOptions } from './useActiveWorkout'

/** 3+ or 1–2 left; "None" is carried by the set's failure mark instead. */
const notHard = (effort: Effort | undefined) => (effort === 'hard' ? undefined : effort)

/** Workouts stay editable for this many days after the day they were logged. */
export const EDIT_WINDOW_DAYS = 7

export function canEditWorkout(date: string, now: Date): boolean {
  return differenceInCalendarDays(now, parseDate(date)) <= EDIT_WINDOW_DAYS
}


/**
 * Edit a saved workout in the logger: its sets load as checked, and saving
 * replaces them (unchecked or removed sets are deleted). XP isn't touched, so
 * editing a set up and back down can't farm it.
 */
export function useEditWorkout() {
  const navigate = useNavigate()

  async function startEditing(workoutId: string): Promise<void> {
    if (useWorkoutStore.getState().draft) {
      toast('Finish or discard your current workout first')
      navigate('/workouts/active')
      return
    }
    const workout = await getWorkoutWithSets(workoutId)
    if (!workout) return
    if (!canEditWorkout(workout.date, new Date())) {
      toast(`Workouts can only be edited for ${EDIT_WINDOW_DAYS} days`)
      return
    }

    // Sets were saved as setIndex = block × 100 + position.
    const byBlock = new Map<number, typeof workout.sets>()
    for (const s of workout.sets) {
      const key = Math.floor(s.setIndex / 100)
      byBlock.set(key, [...(byBlock.get(key) ?? []), s])
    }
    const blocks: BlockDraft[] = []
    for (const sets of byBlock.values()) {
      const exercise = sets[0].exercise
      const cardio = setModeFor(exercise) === 'cardio'
      const stretch = setModeFor(exercise) === 'stretch'
      const unit = await exerciseUnit(exercise.uuid)
      blocks.push({
        exercise,
        restSec: cardio ? 0 : DEFAULT_REST_SECONDS,
        lastSets: await lastSessionSets(exercise.uuid, workout.createdAt),
        unit,
        // "None" left is the last set's failure mark; 3+ and 1–2 stay the block's answer
        effort: cardio ? undefined : notHard(effortFromRpe(sets[lastMain(sets)]?.rpe)),
        sets: sets.map(s => emptySet({
          kind: s.kind ?? undefined,
          failure: !cardio && !stretch && !s.kind && s.rpe === 10,
          uuid: s.uuid,
          weight: weightText(s.weight, unit),
          reps: numText(s.reps),
          duration: stretch ? holdText(s.duration) : numText(s.duration),
          distanceKm: numText(s.distanceKm),
          intensity: cardio ? intensityFromRpe(s.rpe) : undefined,
          done: true,
        })),
      })
    }
    const routine = workout.routineId ? await db.routines.get(workout.routineId) : undefined

    useWorkoutStore.getState().start({
      startedAt: workout.startedAt ?? workout.createdAt,
      name: workout.name ?? 'Workout',
      routineId: workout.routineId,
      category: routine?.category,
      notes: workout.notes,
      blocks,
      editing: {
        workoutId,
        date: workout.date,
        durationMin: workout.durationMin,
        avgHeartRate: workout.avgHeartRate,
        setIds: workout.sets.map(s => s.uuid),
      },
    })
    navigate('/workouts/active', { replace: true })
  }

  async function saveEdits(opts: FinishOptions): Promise<void> {
    const { draft, finished } = useWorkoutStore.getState()
    const editing = draft?.editing
    if (!draft || !editing || finished) return
    const workoutId = editing.workoutId

    if (!(await db.workouts.get(workoutId))) {
      toast.error('This workout was deleted, so the changes can’t be saved')
      useWorkoutStore.getState().discard()
      navigate('/workouts', { replace: true })
      return
    }

    const now = Date.now()
    const sets: WorkoutSet[] = draft.blocks.flatMap((block, bi) => {
      const cardio = setModeFor(block.exercise) === 'cardio'
      const done = block.sets.filter(s => s.done)
      const last = lastMain(done)
      return done
        .map((s, si) => ({
          uuid: s.uuid,
          workoutId,
          exerciseId: block.exercise.uuid,
          setIndex: bi * 100 + si,
          reps: parsePositive(s.reps),
          weight: weightKg(s.weight, block.unit),
          duration: durationOf(s.duration, block),
          distanceKm: parsePositive(s.distanceKm),
          rpe: cardio ? rpeFor(s.intensity ?? 'moderate') : liftRpe(s, si === last, block.effort),
          kind: s.kind,
          updatedAt: now,
          syncPending: true,
        }))
    })
    // Sets the editor never showed (exercise missing here, or synced in meanwhile) are left alone.
    const keep = new Set(sets.map(s => s.uuid))
    const removed = editing.setIds.filter(id => !keep.has(id))

    // Bodyweight on the workout's day, like the day it was logged.
    const weighIn = (await db.bodyMetrics.where('date').belowOrEqual(editing.date).last()) ?? (await db.bodyMetrics.orderBy('date').first())
    const cardioIds = new Set(draft.blocks.filter(b => setModeFor(b.exercise) === 'cardio').map(b => b.exercise.uuid))
    const kcalEst = estimateWorkoutKcal({
      durationMin: opts.durationMin,
      bodyKg: weighIn?.weightKg,
      liftMet: opts.avgHeartRate ? liftMetFromHeartRate(opts.avgHeartRate) : liftMetFor(draft.category, draft.blocks.map(b => b.exercise)),
      cardio: sets.filter(s => cardioIds.has(s.exerciseId)),
    })

    await db.transaction('rw', db.workouts, db.workoutSets, async () => {
      await db.workouts.update(workoutId, {
        name: draft.name.trim() || 'Workout',
        notes: opts.notes?.trim() ?? draft.notes,
        durationMin: opts.durationMin,
        avgHeartRate: opts.avgHeartRate,
        kcalEst,
        updatedAt: now,
        syncPending: true,
      })
      await db.workoutSets.bulkPut(sets)
    })
    await deleteSynced(db.workoutSets, 'workout_sets', removed)

    await readWorkoutAhead(workoutId)
    useWorkoutStore.setState({ finished: true }) // the draft goes once the summary is up (dropFinished)
    navigate(`/workouts/summary/${workoutId}`, { replace: true })
    toast.success('Workout updated')
    await announceAchievements(await evaluateAchievements())
    requestSync()
  }

  /** Drop the edits and go back to the workout as it was saved. */
  async function cancelEditing(): Promise<void> {
    const workoutId = useWorkoutStore.getState().draft?.editing?.workoutId
    if (workoutId) await readWorkoutAhead(workoutId)
    useWorkoutStore.setState({ finished: true }) // the draft goes once the logger is off screen (dropFinished)
    navigate(workoutId ? `/workouts/summary/${workoutId}` : '/workouts', { replace: true })
  }

  return { startEditing, saveEdits, cancelEditing }
}
