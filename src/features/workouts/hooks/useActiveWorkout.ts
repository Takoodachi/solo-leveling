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
import { estimateWorkoutKcal, liftMetFor, setModeFor } from '@/lib/workoutMath'
import { intensityFromRpe, rpeFor } from '@/lib/cardio'
import { findRankUps, rankUpXp, type RankUp } from '@/features/ranks/computeRanks'
import { useWorkoutStore } from '../store'
import { emptySet, parsePositive, type BlockDraft, type SetDraft } from '../types'
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

const num = parsePositive
const str = (n: number | undefined) => (n != null ? String(n) : '')

/** XP for cardio: 1 per minute, capped per entry (sets earn XP.PER_SET). */
const CARDIO_XP_CAP = 120

function prefillSet(block: Pick<BlockDraft, 'exercise' | 'lastSets'>, index: number, targetReps: number): SetDraft {
  const last = block.lastSets?.[index] ?? block.lastSets?.at(-1)
  return setModeFor(block.exercise) === 'time'
    ? emptySet({ duration: String(targetReps) })
    : emptySet({ weight: str(last?.weight), reps: String(targetReps) })
}

/** Cardio from a routine: one entry with the target minutes (sets × minutes for older routines). */
function prefillCardio(block: Pick<BlockDraft, 'lastSets'>, minutes: number): SetDraft {
  const last = block.lastSets?.[0]
  return emptySet({ duration: String(minutes), distanceKm: str(last?.distanceKm), intensity: intensityFromRpe(last?.rpe) })
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
      const cardio = setModeFor(exercise) === 'cardio'
      blocks.push({
        exercise,
        restSec: cardio ? 0 : re.restSec,
        targetReps: re.reps,
        lastSets,
        sets: cardio
          ? [prefillCardio(base, Math.max(1, re.sets) * re.reps)]
          : Array.from({ length: Math.max(1, re.sets) }, (_, j) => prefillSet(base, j, re.reps)),
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
    const cardioIds = new Set(draft.blocks.filter(b => setModeFor(b.exercise) === 'cardio').map(b => b.exercise.uuid))
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
          rpe: cardioIds.has(block.exercise.uuid) ? rpeFor(s.intensity ?? 'moderate') : undefined,
          updatedAt: now,
          syncPending: true,
        })),
    )

    const latestWeight = await db.bodyMetrics.orderBy('date').last()
    const cardioSets = sets.filter(s => cardioIds.has(s.exerciseId))
    const kcalEst = estimateWorkoutKcal({
      durationMin: opts.durationMin,
      bodyKg: latestWeight?.weightKg,
      liftMet: liftMetFor(draft.category, draft.blocks.map(b => b.exercise)),
      cardio: cardioSets,
    })

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
        kcalEst,
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
    const cardioXp = cardioSets.reduce((sum, s) => sum + Math.min(CARDIO_XP_CAP, Math.round((s.duration ?? 0) * XP.PER_CARDIO_MIN)), 0)
    const xp = XP.WORKOUT + (sets.length - cardioSets.length) * XP.PER_SET + cardioXp + newBests.length * XP.NEW_BEST + rankUpXp(rankUps)
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
