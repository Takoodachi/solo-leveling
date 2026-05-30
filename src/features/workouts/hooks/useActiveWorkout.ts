import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'
import { db } from '@/db'
import { syncService } from '@/lib/sync'
import { useAuthStore } from '@/features/auth/authStore'
import { today } from '@/lib/date'
import { detectAndRecordPrs, formatPrLabel, unlockFirstPrAchievement } from '@/lib/prDetection'
import { useWorkoutStore } from '../store'
import { getWorkoutWithSets } from './useWorkouts'
import type { WorkoutDraft, BlockDraft } from '../types'

export function useActiveWorkout() {
  const navigate = useNavigate()
  const store = useWorkoutStore()

  async function saveWorkout() {
    const { draft } = useWorkoutStore.getState()
    if (!draft) return

    const now = Date.now()
    const durationMin = Math.max(1, Math.round((now - draft.startedAt) / 60000))
    const workoutUuid = crypto.randomUUID()

    const sets = draft.blocks.flatMap((block, blockIdx) =>
      block.sets.map((set, setIdx) => ({
        uuid: set.uuid,
        workoutId: workoutUuid,
        exerciseId: block.exercise.uuid,
        setIndex: blockIdx * 100 + setIdx,
        reps: set.reps ? Number(set.reps) : undefined,
        weight: set.weight ? Number(set.weight) : undefined,
        duration: set.duration ? Number(set.duration) : undefined,
        distanceKm: set.distanceKm ? Number(set.distanceKm) : undefined,
        rpe: set.rpe ? Number(set.rpe) : undefined,
        updatedAt: now,
        syncPending: true,
      }))
    )

    await db.transaction('rw', db.workouts, db.workoutSets, async () => {
      await db.workouts.add({
        uuid: workoutUuid,
        date: today(),
        notes: draft.notes,
        durationMin,
        createdAt: draft.startedAt,
        updatedAt: now,
        syncPending: true,
      })
      if (sets.length > 0) {
        await db.workoutSets.bulkAdd(sets)
      }
    })

    store.discardWorkout()

    // PR detection runs after the save commits so history queries see the new sets.
    const prs = await detectAndRecordPrs(sets)
    let firstPrUnlocked = false
    if (prs.length > 0) {
      firstPrUnlocked = await unlockFirstPrAchievement()
    }

    const userId = useAuthStore.getState().userId
    if (userId) void syncService.sync(userId)

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#8b5cf6', '#a855f7', '#d946ef'] // matches primary purples
    })

    toast.success(`Workout saved — ${sets.length} sets`)
    for (const pr of prs) {
      toast.success(`New PR: ${formatPrLabel(pr)}`, { icon: '💪' })
    }
    if (firstPrUnlocked) {
      toast.success('Achievement unlocked: New Record', { icon: '🏆' })
    }
    navigate('/workouts')
  }

  async function repeatLastWorkout() {
    const lastWorkout = await db.workouts.orderBy('createdAt').last()
    if (!lastWorkout) {
      toast.info('No previous workout to repeat')
      return
    }

    const withSets = await getWorkoutWithSets(lastWorkout.uuid)
    if (!withSets || withSets.sets.length === 0) {
      toast.info('Previous workout had no sets')
      return
    }

    // Group sets by exercise preserving order
    const blockMap = new Map<string, BlockDraft>()
    for (const set of withSets.sets) {
      if (!blockMap.has(set.exerciseId)) {
        blockMap.set(set.exerciseId, { exercise: set.exercise, sets: [] })
      }
      blockMap.get(set.exerciseId)!.sets.push({
        uuid: crypto.randomUUID(),
        reps: set.reps != null ? String(set.reps) : '',
        weight: set.weight != null ? String(set.weight) : '',
        rpe: set.rpe != null ? String(set.rpe) : '',
        duration: set.duration != null ? String(set.duration) : '',
        distanceKm: set.distanceKm != null ? String(set.distanceKm) : '',
      })
    }

    const draft: WorkoutDraft = {
      startedAt: Date.now(),
      notes: '',
      blocks: Array.from(blockMap.values()),
    }

    store.loadDraft(draft)
    navigate('/workouts/active')
  }

  return { saveWorkout, repeatLastWorkout }
}
