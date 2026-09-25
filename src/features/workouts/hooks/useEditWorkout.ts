import { useNavigate } from 'react-router-dom'
import { differenceInCalendarDays } from 'date-fns'
import { toast } from 'sonner'
import { db } from '@/db'
import type { WorkoutSet } from '@/types'
import { deleteSynced, requestSync } from '@/lib/sync'
import { parseDate } from '@/lib/date'
import { evaluateAchievements } from '@/lib/achievementEval'
import { estimateWorkoutKcal, liftMetFor, setModeFor } from '@/lib/workoutMath'
import { intensityFromRpe, rpeFor } from '@/lib/cardio'
import { DEFAULT_REST_SECONDS } from '@/features/settings/hooks/useSettings'
import { useWorkoutStore } from '../store'
import { emptySet, parsePositive, type BlockDraft } from '../types'
import { getWorkoutWithSets, lastSessionSets } from './useWorkoutHistory'
import type { FinishOptions } from './useActiveWorkout'

/** Workouts stay editable for this many days after the day they were logged. */
export const EDIT_WINDOW_DAYS = 7

export function canEditWorkout(date: string, now: Date): boolean {
  return differenceInCalendarDays(now, parseDate(date)) <= EDIT_WINDOW_DAYS
}

const str = (n: number | undefined) => (n != null ? String(n) : '')

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
      blocks.push({
        exercise,
        restSec: cardio ? 0 : DEFAULT_REST_SECONDS,
        lastSets: await lastSessionSets(exercise.uuid, workout.createdAt),
        sets: sets.map(s => emptySet({
          uuid: s.uuid,
          weight: str(s.weight),
          reps: str(s.reps),
          duration: str(s.duration),
          distanceKm: str(s.distanceKm),
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
    const draft = useWorkoutStore.getState().draft
    const editing = draft?.editing
    if (!draft || !editing) return
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
      return block.sets
        .filter(s => s.done)
        .map((s, si) => ({
          uuid: s.uuid,
          workoutId,
          exerciseId: block.exercise.uuid,
          setIndex: bi * 100 + si,
          reps: parsePositive(s.reps),
          weight: parsePositive(s.weight),
          duration: parsePositive(s.duration),
          distanceKm: parsePositive(s.distanceKm),
          rpe: cardio ? rpeFor(s.intensity ?? 'moderate') : undefined,
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
      liftMet: liftMetFor(draft.category, draft.blocks.map(b => b.exercise)),
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

    navigate(`/workouts/summary/${workoutId}`, { replace: true })
    useWorkoutStore.getState().discard()
    toast.success('Workout updated')
    for (const a of await evaluateAchievements()) toast.success(`Achievement unlocked: ${a.title}`, { icon: a.icon })
    requestSync()
  }

  /** Drop the edits and go back to the workout as it was saved. */
  function cancelEditing(): void {
    const workoutId = useWorkoutStore.getState().draft?.editing?.workoutId
    navigate(workoutId ? `/workouts/summary/${workoutId}` : '/workouts', { replace: true })
    useWorkoutStore.getState().discard()
  }

  return { startEditing, saveEdits, cancelEditing }
}
