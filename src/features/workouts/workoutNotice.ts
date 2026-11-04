import { soloHas, soloPlugin, type WorkoutNoticeState } from '@/lib/native'
import { setModeFor } from '@/lib/workoutMath'
import type { BlockDraft, SetDraft, WorkoutDraft } from './types'

/**
 * The Android app's workout notification (WorkoutNotice.kt): on the lock screen and in the
 * shade while a workout is open, with what's next and the rest counting down (or the workout's
 * time counting up). The clock runs on the phone; this only says what to show.
 */

function describe(block: BlockDraft, set: SetDraft): string {
  if (setModeFor(block.exercise) !== 'load') return set.duration ? `${set.duration} min` : ''
  const weight = set.weight && `${set.weight} ${block.unit ?? 'kg'}`
  if (weight && set.reps) return `${weight} × ${set.reps}`
  return set.reps ? `${set.reps} reps` : weight || ''
}

/** What the notification shows for this draft: the first exercise with a set still to do. */
export function noticeFor(draft: WorkoutDraft, restEndsAt: number | null, now: number): WorkoutNoticeState {
  const name = draft.name.trim() || 'Workout'
  const block = draft.blocks.find(b => b.sets.some(s => !s.done))
  if (!block) {
    const done = draft.blocks.length > 0
    return { name, title: done ? 'All sets done' : 'Add an exercise', text: done ? 'Finish when you’re ready' : '', startedAt: draft.startedAt, restEndsAt: null }
  }
  const i = block.sets.findIndex(s => !s.done)
  const what = describe(block, block.sets[i])
  const text = setModeFor(block.exercise) === 'cardio' ? what : [`Set ${i + 1} of ${block.sets.length}`, what].filter(Boolean).join(' · ')
  return { name, title: block.exercise.name, text, startedAt: draft.startedAt, restEndsAt: restEndsAt && restEndsAt > now ? restEndsAt : null }
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
