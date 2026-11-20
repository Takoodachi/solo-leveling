import { soloHas, soloPlugin, type WorkoutNoticeState } from '@/lib/native'
import { setModeFor } from '@/lib/workoutMath'
import type { BlockDraft, SetDraft, WorkoutDraft } from './types'

/**
 * The Android app's workout notification (WorkoutNotice.kt): on the lock screen and in the
 * shade while a workout is open, with what's next and the rest counting down (or the workout's
 * time counting up). The clock runs on the phone; this only says what to show.
 */

function describe(block: BlockDraft, set: SetDraft): string {
  const mode = setModeFor(block.exercise)
  if (mode === 'stretch') return set.duration ? `${set.duration} s hold` : ''
  if (mode !== 'load') return set.duration ? `${set.duration} min` : ''
  const weight = set.weight && `${set.weight} ${block.unit ?? 'kg'}`
  if (weight && set.reps) return `${weight} × ${set.reps}`
  return set.reps ? `${set.reps} reps` : weight || ''
}

/** The set the notification and the watch show, and the watch's Done ticks: the first one not done. */
export function nextSet(draft: WorkoutDraft): { blockIdx: number; setIdx: number } | null {
  const blockIdx = draft.blocks.findIndex(b => b.sets.some(s => !s.done))
  return blockIdx < 0 ? null : { blockIdx, setIdx: draft.blocks[blockIdx].sets.findIndex(s => !s.done) }
}

/** What the notification shows for this draft: the first exercise with a set still to do. */
export function noticeFor(draft: WorkoutDraft, restEndsAt: number | null, now: number): WorkoutNoticeState {
  const name = draft.name.trim() || 'Workout'
  const at = nextSet(draft)
  if (!at) {
    const done = draft.blocks.length > 0
    return { name, title: done ? 'All sets done' : 'Add an exercise', text: done ? 'Finish when you’re ready' : '', startedAt: draft.startedAt, restEndsAt: null, canTick: false }
  }
  const block = draft.blocks[at.blockIdx]
  const i = at.setIdx
  const what = describe(block, block.sets[i])
  const text = setModeFor(block.exercise) === 'cardio' ? what : [`Set ${i + 1} of ${block.sets.length}`, what].filter(Boolean).join(' · ')
  return { name, title: block.exercise.name, text, startedAt: draft.startedAt, restEndsAt: restEndsAt && restEndsAt > now ? restEndsAt : null, canTick: true }
}

let shown = ''

/** Shows, updates or clears it (null). The same state twice costs nothing. */
export async function syncWorkoutNotice(state: WorkoutNoticeState | null): Promise<void> {
  const key = JSON.stringify(state)
  if (key === shown || !soloHas('workoutNotice')) return
  shown = key
  const plugin = await soloPlugin()
  try {
    await (state ? plugin?.workoutNotice(state) : plugin?.clearWorkoutNotice())
  } catch (err) {
    shown = '' // try again with the next change
    throw err
  }
}
