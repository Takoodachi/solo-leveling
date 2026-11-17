import { useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { WeightUnit } from '@/types'
import { requestSync } from '@/lib/sync'
import { isLb } from '../units'
import { useUnits } from '@/features/settings/units'

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

/** An exercise's own unit, when it was switched to one on its card. */
const ownUnit = (unit: WeightUnit | null | undefined): WeightUnit | undefined => (unit ? (isLb(unit) ? 'lb' : 'kg') : undefined)

/** The unit an exercise is logged in: its own if it was switched on its card, else the account's (Settings → Units). */
export async function exerciseUnit(exerciseId: string): Promise<WeightUnit> {
  return ownUnit((await db.exerciseNotes.get(noteId(exerciseId)))?.unit) ?? useUnits.getState().weight
}

/**
 * Remember the unit for an exercise, on the same row as its note. The account's unit is the
 * default, so an exercise keeps one of its own only while it's the other unit, and follows the
 * account again once it's switched back.
 */
export async function saveExerciseUnit(exerciseId: string, unit: WeightUnit): Promise<void> {
  const uuid = noteId(exerciseId)
  const own = unit === useUnits.getState().weight ? undefined : unit
  await db.transaction('rw', db.exerciseNotes, async () => {
    const existing = await db.exerciseNotes.get(uuid)
    if (ownUnit(existing?.unit) === own) return
    await db.exerciseNotes.put({ text: '', ...existing, uuid, exerciseId, unit: own, updatedAt: Date.now(), syncPending: true })
  })
  requestSync()
}

/** The unit each exercise's sets read in, as they were typed: its own, else the account's. */
export function useExerciseUnits(): (exerciseId: string) => WeightUnit {
  const own = useLiveQuery(async () => new Map((await db.exerciseNotes.toArray()).flatMap(n => {
    const unit = ownUnit(n.unit)
    return unit ? [[n.exerciseId, unit] as const] : []
  })), [])
  const unit = useUnits(s => s.weight)
  return useCallback((exerciseId: string) => own?.get(exerciseId) ?? unit, [own, unit])
}
