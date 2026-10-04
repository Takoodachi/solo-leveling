import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { requestSync } from '@/lib/sync'

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
  await db.exerciseNotes.put({ uuid, exerciseId, text: next, updatedAt: Date.now(), syncPending: true })
  requestSync()
}
