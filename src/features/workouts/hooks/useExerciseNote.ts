import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { WeightUnit } from '@/types'
import { requestSync } from '@/lib/sync'
import { isLb } from '../units'

// One note per exercise, so two devices write the same row instead of two
const noteId = (exerciseId: string) => `note-${exerciseId}`

/** Your note on an exercise: '' when there's none, undefined while it loads. */
export function useExerciseNote(exerciseId: string): string | undefined {
  return useLiveQuery(async () => (await db.exerciseNotes.get(noteId(exerciseId)))?.text ?? '', [exerciseId])
}

export async function saveExerciseNote(exerciseId: string, text: string): Promise<void> {
  const uuid = noteId(exerciseId)
  const next = text.trim()
  const existing = await db.exerciseNotes.get(uuid)
  if ((existing?.text ?? '') === next) return
  // A cleared note stays as an empty row, so the change reaches the other devices
  await db.exerciseNotes.put({ ...existing, uuid, exerciseId, text: next, updatedAt: Date.now(), syncPending: true })
  requestSync()
}

/** The unit an exercise is logged in (kg unless it was switched to lb). */
export async function exerciseUnit(exerciseId: string): Promise<WeightUnit> {
  return isLb((await db.exerciseNotes.get(noteId(exerciseId)))?.unit) ? 'lb' : 'kg'
}

/** Remember the unit for an exercise, on the same row as its note. */
export async function saveExerciseUnit(exerciseId: string, unit: WeightUnit): Promise<void> {
  const uuid = noteId(exerciseId)
  await db.transaction('rw', db.exerciseNotes, async () => {
    const existing = await db.exerciseNotes.get(uuid)
    if (isLb(existing?.unit) === isLb(unit)) return
    await db.exerciseNotes.put({ text: '', ...existing, uuid, exerciseId, unit, updatedAt: Date.now(), syncPending: true })
  })
  requestSync()
}

/** The exercises logged in lb, for showing their saved sets the way they were typed. */
export function useLbExercises(): Set<string> {
  const ids = useLiveQuery(async () => (await db.exerciseNotes.filter(n => isLb(n.unit)).toArray()).map(n => n.exerciseId), [])
  return new Set(ids)
}
