import type { Exercise } from '@/types'
import { setModeFor } from '@/lib/workoutMath'
import { cardioSet, emptySet, numText, type BlockDraft } from './types'
import { weightText } from './units'

/**
 * The card that takes another's place in the logger (the machine is taken): the same rest and as
 * many sets as were still to do, with the new exercise's own numbers from its last session. The
 * rep target only carries over between exercises logged the same way.
 */
export function replacementBlock(old: BlockDraft, exercise: Exercise, history: Pick<BlockDraft, 'lastSets' | 'trend' | 'unit'>): BlockDraft {
  const { lastSets, unit } = history
  const mode = setModeFor(exercise)
  if (mode === 'cardio') return { exercise, restSec: 0, sets: [cardioSet(lastSets?.[0])], ...history }

  const target = setModeFor(old.exercise) === mode ? old.targetReps : undefined
  const left = Math.max(1, old.sets.filter(s => !s.done).length)
  const sets = Array.from({ length: left }, (_, i) => {
    const last = lastSets?.[i] ?? lastSets?.at(-1)
    return mode === 'time'
      ? emptySet({ duration: numText(target ?? last?.duration) })
      : emptySet({ weight: weightText(last?.weight, unit), reps: numText(target ?? last?.reps) })
  })
  return { exercise, restSec: old.restSec, targetReps: target, sets, ...history }
}
