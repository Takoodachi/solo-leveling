import type { Exercise } from '@/types'
import { intensityFromRpe } from '@/lib/cardio'
import { setModeFor } from '@/lib/workoutMath'
import { emptySet, type BlockDraft } from './types'
import { weightText } from './units'

const str = (n: number | undefined) => (n != null ? String(n) : '')

/**
 * The card that takes another's place in the logger (the machine is taken): the same rest and as
 * many sets as were still to do, with the new exercise's own numbers from its last session. The
 * rep target only carries over between exercises logged the same way.
 */
export function replacementBlock(old: BlockDraft, exercise: Exercise, history: Pick<BlockDraft, 'lastSets' | 'trend' | 'unit'>): BlockDraft {
  const { lastSets, unit } = history
  const mode = setModeFor(exercise)
  if (mode === 'cardio') {
    const last = lastSets?.[0]
    const entry = emptySet({ duration: str(last?.duration), distanceKm: str(last?.distanceKm), intensity: intensityFromRpe(last?.rpe) })
    return { exercise, restSec: 0, sets: [entry], ...history }
  }

  const target = setModeFor(old.exercise) === mode ? old.targetReps : undefined
  const left = Math.max(1, old.sets.filter(s => !s.done).length)
  const sets = Array.from({ length: left }, (_, i) => {
    const last = lastSets?.[i] ?? lastSets?.at(-1)
    return mode === 'time'
      ? emptySet({ duration: str(target ?? last?.duration) })
      : emptySet({ weight: weightText(last?.weight, unit), reps: str(target ?? last?.reps) })
  })
  return { exercise, restSec: old.restSec, targetReps: target, sets, ...history }
}
