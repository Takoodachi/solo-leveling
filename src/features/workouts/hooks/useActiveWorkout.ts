import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { db } from '@/db'
import type { Routine, WorkoutSet } from '@/types'
import type { RoutineTemplate } from '@/data/routineTemplates'
import { requestSync } from '@/lib/sync'
import { today } from '@/lib/date'
import { updateStreak } from '@/lib/streak'
import { grantXp, XP } from '@/lib/xp'
import { evaluateAchievements } from '@/lib/achievementEval'
import { estimateKcal, metFor, metForExercises, setModeFor } from '@/lib/workoutMath'
import { findRankUps, rankUpXp, type RankUp } from '@/features/ranks/computeRanks'
import { useWorkoutStore } from '../store'
import { emptySet, type BlockDraft, type SetDraft } from '../types'
import { findNewBests, getWorkoutWithSets, lastSessionSets, type NewBest } from './useWorkoutHistory'

export interface FinishOptions {
  durationMin: number
  avgHeartRate?: number
  notes?: string
}

/** Passed to the summary screen via router state right after finishing. */
export interface FinishResult {
  celebrate: true
  xp: number
  newBests: NewBest[]
  rankUps: RankUp[]
}

function num(v: string): number | undefined {
  const n = Number(v.replace(',', '.'))
  return v.trim() !== '' && Number.isFinite(n) && n > 0 ? n : undefined
}

function prefillSet(block: Pick<BlockDraft, 'exercise' | 'lastSets'>, index: number, targetReps: number): SetDraft {
  const last = block.lastSets?.[index] ?? block.lastSets?.at(-1)
  const str = (n: number | undefined) => (n != null ? String(n) : '')
  switch (setModeFor(block.exercise)) {
    case 'load':
      return emptySet({ weight: str(last?.weight), reps: String(targetReps) })
    case 'time':
      return emptySet({ duration: String(targetReps), distanceKm: str(last?.distanceKm) })
    case 'distance':
      return emptySet({ distanceKm: str(last?.distanceKm), duration: str(last?.duration) })
  }
}

export function useActiveWorkout() {
  const navigate = useNavigate()

  function guardExistingDraft(): boolean {
    if (!useWorkoutStore.getState().draft) return false
    toast('You have a workout in progress', { description: 'Finish or discard it before starting another.' })
    navigate('/workouts/active')
    return true
  }

  async function startFromRoutine(routine: Routine | RoutineTemplate, isTemplate = false): Promise<void> {
    if (guardExistingDraft()) return
    const exercises = await db.exercises.bulkGet(routine.exercises.map(e => e.exerciseId))
    const blocks: BlockDraft[] = []
    for (const [i, re] of routine.exercises.entries()) {
      const exercise = exercises[i]
      if (!exercise) continue
      const lastSets = await lastSessionSets(exercise.uuid)
      const base = { exercise, lastSets }
      blocks.push({
        exercise,
        restSec: re.restSec,
        targetReps: re.reps,
        lastSets,
        sets: Array.from({ length: Math.max(1, re.sets) }, (_, j) => prefillSet(base, j, re.reps)),
      })
    }
    useWorkoutStore.getState().start({
      startedAt: Date.now(),
      name: routine.name,
      routineId: isTemplate ? undefined : routine.uuid,
      category: routine.category,
      notes: '',
      blocks,
    })
    navigate('/workouts/active')
  }

  function startEmpty(): void {
    if (guardExistingDraft()) return
    useWorkoutStore.getState().start({ startedAt: Date.now(), name: 'Workout', notes: '', blocks: [] })
    navigate('/workouts/active')
  }

  /** Save the draft's completed sets as a workout and open the summary. */
  async function finish(opts: FinishOptions): Promise<void> {
    const draft = useWorkoutStore.getState().draft
    if (!draft) return

    const now = Date.now()
    const workoutUuid = crypto.randomUUID()
    const sets: WorkoutSet[] = draft.blocks.flatMap((block, bi) =>
      block.sets
        .filter(s => s.done)
        .map((s, si) => ({
          uuid: s.uuid,
          workoutId: workoutUuid,
          exerciseId: block.exercise.uuid,
          setIndex: bi * 100 + si,
          reps: num(s.reps),
          weight: num(s.weight),
          duration: num(s.duration),
          distanceKm: num(s.distanceKm),
          updatedAt: now,
          syncPending: true,
        })),
    )

    const latestWeight = await db.bodyMetrics.orderBy('date').last()
    const met = draft.category ? metFor(draft.category) : metForExercises(draft.blocks.map(b => b.exercise))

    await db.transaction('rw', db.workouts, db.workoutSets, async () => {
      await db.workouts.add({
        uuid: workoutUuid,
        date: today(),
        name: draft.name.trim() || 'Workout',
        routineId: draft.routineId,
        notes: opts.notes?.trim() ?? draft.notes,
        durationMin: opts.durationMin,
        startedAt: draft.startedAt,
        createdAt: draft.startedAt,
        avgHeartRate: opts.avgHeartRate,
        kcalEst: estimateKcal(met, latestWeight?.weightKg, opts.durationMin),
        updatedAt: now,
        syncPending: true,
      })
      if (sets.length > 0) await db.workoutSets.bulkAdd(sets)
    })
    useWorkoutStore.getState().discard()

    const saved = await getWorkoutWithSets(workoutUuid)
    const newBests = saved ? await findNewBests(saved) : []
    const rankUps = saved ? await findRankUps(saved) : []

    await updateStreak()
    const xp = XP.WORKOUT + sets.length * XP.PER_SET + newBests.length * XP.NEW_BEST + rankUpXp(rankUps)
    const xpResult = await grantXp(xp)
    const achievements = await evaluateAchievements()
    requestSync()

    if (xpResult?.leveledUp) toast.success(`Level up! You're now level ${xpResult.newLevel}`, { icon: '⭐' })
    for (const a of achievements) toast.success(`Achievement unlocked: ${a.title}`, { icon: a.icon })

    const result: FinishResult = { celebrate: true, xp, newBests, rankUps }
    navigate(`/workouts/summary/${workoutUuid}`, { replace: true, state: result })
  }

  return { startFromRoutine, startEmpty, finish }
}
