import { useWorkoutStore } from './store'
import { setHasValue } from './types'
import { setModeFor } from '@/lib/workoutMath'
import { lastSetsOf } from './units'
import { nextSet } from './workoutNotice'
import { addRestSeconds, startRest, stopRest } from './hooks/useRestTimer'

/**
 * The watch app's buttons (android/wear, through WatchActions.kt and the `watchAction` event):
 * Done ticks the set the watch is showing, Skip and +15 s act on the rest, each as the same tap
 * on the phone would. The phone has to be running the app; a press it doesn't get changes nothing.
 */

export function applyWatchAction(action: string, defaultRest: number): void {
  const store = useWorkoutStore.getState()
  const draft = store.draft
  if (!draft || draft.editing) return
  if (action === 'skip') return stopRest()
  if (action === 'add15') return addRestSeconds(15)
  if (action !== 'tick') return
  const at = nextSet(draft)
  if (!at) return
  const block = draft.blocks[at.blockIdx]
  // A wrist can't type numbers: an empty set is done as last time's, as "Use last" fills it
  const last = setHasValue(block.sets[at.setIdx]) ? undefined : lastSetsOf(block)?.[at.setIdx]
  if (last?.weight != null) store.updateSet(at.blockIdx, at.setIdx, 'weight', String(last.weight))
  if (last?.reps != null) store.updateSet(at.blockIdx, at.setIdx, 'reps', String(last.reps))
  if (last?.duration != null) store.updateSet(at.blockIdx, at.setIdx, 'duration', String(last.duration))
  if (last?.distanceKm != null) store.updateSet(at.blockIdx, at.setIdx, 'distanceKm', String(last.distanceKm))
  if (!store.toggleDone(at.blockIdx, at.setIdx)) return
  // A stretch with no rest goes straight on to the next hold; anything else rests at least the default
  if (setModeFor(block.exercise) !== 'stretch' || block.restSec > 0) startRest(block.restSec || defaultRest)
  store.foldWhenDone(at.blockIdx)
}
