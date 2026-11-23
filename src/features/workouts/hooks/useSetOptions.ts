import { useState, type ComponentProps } from 'react'
import { toast } from 'sonner'
import type { SetKind } from '@/types'
import { useWorkoutStore } from '../store'
import { setHasValue, type BlockDraft } from '../types'
import { REST_PAUSE_SECONDS, chainEnd, isMainSet, kindLabel } from '../setKinds'
import { restEndsAt, startRest, stopRest } from './useRestTimer'
import { restForFailure } from '../autoRest'
import type SetMenu from '../components/SetMenu'

/**
 * A set's options in the logger (SetMenu, from a tap on its number; setKinds.ts): its failure mark,
 * a drop set, rest-pause or partials straight after it, or out with an Undo. `lift`: the first two
 * are there only for weight × reps sets, not for holds or stretches.
 */
export function useSetOptions(block: BlockDraft, blockIdx: number, lift: boolean, auto: boolean) {
  const { toggleFailure, addCarryOn, removeSet, restoreSet, draft } = useWorkoutStore()
  const [open, setOpen] = useState<number | null>(null)

  // Each ordinary set's number; the rows carrying one on have none
  const numbers: (number | undefined)[] = []
  let count = 0
  for (const s of block.sets) numbers.push(s.kind ? undefined : ++count)

  function carryOn(setIdx: number, kind: SetKind) {
    addCarryOn(blockIdx, setIdx, kind)
    // It follows straight on: the rest running from that set is over, or is only the pause before rest-pause
    if (restEndsAt()) {
      if (kind === 'rest-pause') startRest(REST_PAUSE_SECONDS, 'Rest-pause')
      else stopRest()
    }
  }

  // Out with the rows that carry it on; one with something in it can be put back, like a removed exercise
  function remove(setIdx: number) {
    const removed = block.sets.slice(setIdx, chainEnd(block.sets, setIdx))
    const row = block.sets[setIdx]
    const startedAt = draft?.startedAt
    removeSet(blockIdx, setIdx)
    if (startedAt == null || !removed.some(r => r.done || setHasValue(r))) return
    const what = row.kind ? `a ${kindLabel(row.kind).toLowerCase()}` : `set ${numbers[setIdx]}`
    toast(`Removed ${what} of ${block.exercise.name}`, {
      duration: 7000,
      action: { label: 'Undo', onClick: () => restoreSet(blockIdx, setIdx, removed, block.exercise.uuid, startedAt) },
    })
  }

  function failure(setIdx: number) {
    const row = block.sets[setIdx]
    toggleFailure(blockIdx, setIdx)
    // Marked while its own rest runs (the set just done, with nothing carrying it on): Auto rest adds its 30 s, or takes them back
    const next = block.sets[setIdx + 1]
    if (row.done && !next?.done && !next?.kind) restForFailure(block.exercise, !row.failure, auto)
  }

  const row = open != null ? block.sets[open] : undefined
  const at = open ?? 0
  const menu: ComponentProps<typeof SetMenu> = {
    title: row ? (row.kind ? kindLabel(row.kind) : `Set ${numbers[at]}`) : null,
    onClose: () => setOpen(null),
    failure: row?.failure,
    onFailure: lift && row && !row.kind ? () => failure(at) : undefined,
    onAdd: lift ? kind => carryOn(at, kind) : undefined,
    // A set goes with its rows, so the exercise's only set stays; a row on its own can always go
    onRemove: row && (row.kind || block.sets.filter(isMainSet).length > 1) ? () => remove(at) : undefined,
  }
  // A hold's or a stretch's only set has nothing to offer
  const hasMenu = lift || block.sets.length > 1

  return { numbers, menu, openMenu: hasMenu ? setOpen : undefined, carryOn }
}
