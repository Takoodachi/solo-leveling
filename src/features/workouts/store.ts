import { create } from 'zustand'
import { db } from '@/db'
import { moved } from '@/lib/utils'
import type { Exercise, WeightUnit } from '@/types'
import { applyFill, type HintFill } from './progression'
import { type WorkoutDraft, type BlockDraft, type SetDraft, type LastSet, type LiftTrend, cardioSet, emptySet, numText, setHasValue } from './types'
import { convertWeightText, weightText } from './units'

type SetField = keyof Omit<SetDraft, 'uuid' | 'done'>

/** How long the last tick shows before its card folds away. */
const FOLD_DELAY_MS = 600

interface WorkoutStore {
  draft: WorkoutDraft | null
  /** True once we've checked IndexedDB for an in-progress workout. */
  restored: boolean

  start: (draft: WorkoutDraft) => void
  discard: () => void
  rename: (name: string) => void
  setNotes: (notes: string) => void

  addBlock: (exercise: Exercise, opts?: { restSec?: number; lastSets?: LastSet[]; trend?: LiftTrend; unit?: WeightUnit }) => void
  /** Takes the block out and hands it back, so the removal can be undone. */
  removeBlock: (blockIdx: number) => BlockDraft | undefined
  /** Puts a removed block back where it was, if the workout it came from is still the one open. */
  restoreBlock: (block: BlockDraft, blockIdx: number, startedAt: number) => void
  /** Takes the exercise at `from` to `to`; the ones between move over. */
  moveBlock: (from: number, to: number) => void
  /** Log this exercise in another unit: its weight fields keep their weight, not their number. */
  setUnit: (blockIdx: number, unit: WeightUnit) => void
  toggleCollapsed: (blockIdx: number) => void
  /** Call after a tick: if that was the card's last set, it folds away a moment later. */
  foldWhenDone: (blockIdx: number) => void
  /**
   * Another exercise in this one's place (the machine is taken). Sets already ticked stay logged
   * under the old exercise and the new one takes the rest; returns how to take it back.
   */
  replaceBlock: (blockIdx: number, block: BlockDraft) => (() => void) | undefined

  addSet: (blockIdx: number) => void
  updateSet: (blockIdx: number, setIdx: number, field: SetField, value: string) => void
  toggleDone: (blockIdx: number, setIdx: number) => boolean
  removeSet: (blockIdx: number, setIdx: number) => void
  /** Takes a set to another place in its exercise. */
  moveSet: (blockIdx: number, from: number, to: number) => void
  /** Puts a removed set back where it was, if that exercise is still there in the same workout. */
  restoreSet: (blockIdx: number, setIdx: number, set: SetDraft, exerciseId: string, startedAt: number) => void
  /** Write a progression hint's numbers into the block's sets that aren't done yet. */
  fillSets: (blockIdx: number, fill: HintFill) => void
  markAllFilledDone: () => void
}

function mapBlock(draft: WorkoutDraft, blockIdx: number, fn: (b: WorkoutDraft['blocks'][number]) => WorkoutDraft['blocks'][number]): WorkoutDraft {
  return { ...draft, blocks: draft.blocks.map((b, i) => (i === blockIdx ? fn(b) : b)) }
}

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  draft: null,
  restored: false,

  start: draft => set({ draft }),
  discard: () => set({ draft: null }),
  rename: name => set(s => (s.draft ? { draft: { ...s.draft, name } } : s)),
  setNotes: notes => set(s => (s.draft ? { draft: { ...s.draft, notes } } : s)),

  addBlock: (exercise, opts) =>
    set(s => {
      if (!s.draft) return s
      const last = opts?.lastSets?.[0]
      // Cardio is one entry (time + distance + effort); everything else starts from last session's first set.
      const first = exercise.type === 'cardio'
        ? cardioSet(last)
        : emptySet({ weight: weightText(last?.weight, opts?.unit), reps: numText(last?.reps) })
      return {
        draft: {
          ...s.draft,
          blocks: [...s.draft.blocks, { exercise, restSec: opts?.restSec ?? 90, sets: [first], lastSets: opts?.lastSets, trend: opts?.trend, unit: opts?.unit }],
        },
      }
    }),

  removeBlock: blockIdx => {
    const draft = get().draft
    const removed = draft?.blocks[blockIdx]
    if (!draft || !removed) return undefined
    set({ draft: { ...draft, blocks: draft.blocks.filter((_, i) => i !== blockIdx) } })
    return removed
  },

  restoreBlock: (block, blockIdx, startedAt) =>
    set(s => {
      if (!s.draft || s.draft.startedAt !== startedAt) return s
      const blocks = [...s.draft.blocks]
      blocks.splice(Math.min(blockIdx, blocks.length), 0, block)
      return { draft: { ...s.draft, blocks } }
    }),

  moveBlock: (from, to) =>
    set(s => (s.draft?.blocks[from] && s.draft.blocks[to] ? { draft: { ...s.draft, blocks: moved(s.draft.blocks, from, to) } } : s)),

  setUnit: (blockIdx, unit) =>
    set(s => {
      if (!s.draft) return s
      return {
        draft: mapBlock(s.draft, blockIdx, b => ({
          ...b,
          unit,
          sets: b.sets.map(st => ({ ...st, weight: convertWeightText(st.weight, b.unit, unit) })),
        })),
      }
    }),

  toggleCollapsed: blockIdx =>
    set(s => (s.draft ? { draft: mapBlock(s.draft, blockIdx, b => ({ ...b, collapsed: !b.collapsed })) } : s)),

  foldWhenDone: blockIdx => {
    const draft = get().draft
    const block = draft?.blocks[blockIdx]
    // Not while correcting a past workout, where ticks are only being fixed
    if (!draft || draft.editing || !block?.sets.every(st => st.done)) return
    const id = block.exercise.uuid
    setTimeout(() => set(s => {
      // Still the same card, and still done: nothing was unticked or moved meanwhile
      const now = s.draft?.blocks[blockIdx]
      if (!s.draft || !now || now.exercise.uuid !== id || now.collapsed || !now.sets.every(st => st.done)) return s
      // …and the next exercise still to do opens in its place
      const next = s.draft.blocks.findIndex((b, i) => i > blockIdx && !b.sets.every(st => st.done))
      return { draft: { ...s.draft, blocks: s.draft.blocks.map((b, i) => (i === blockIdx ? { ...b, collapsed: true } : i === next ? { ...b, collapsed: false } : b)) } }
    }), FOLD_DELAY_MS)
  },

  replaceBlock: (blockIdx, block) => {
    const draft = get().draft
    const old = draft?.blocks[blockIdx]
    if (!draft || !old) return undefined
    const done = old.sets.filter(st => st.done)
    const blocks = [...draft.blocks]
    // Work already done isn't thrown away: it stays as its own (folded) card, above the new one
    if (done.length > 0) blocks.splice(blockIdx, 1, { ...old, sets: done, collapsed: true }, block)
    else blocks[blockIdx] = block
    set({ draft: { ...draft, blocks } })

    const at = done.length > 0 ? blockIdx + 1 : blockIdx
    return () =>
      set(s => {
        // Only while the replacement is still where it was put, in the same workout
        if (!s.draft || s.draft.startedAt !== draft.startedAt || s.draft.blocks[at]?.exercise.uuid !== block.exercise.uuid) return s
        const next = [...s.draft.blocks]
        next.splice(blockIdx, at - blockIdx + 1, old)
        return { draft: { ...s.draft, blocks: next } }
      })
  },

  addSet: blockIdx =>
    set(s => {
      if (!s.draft) return s
      return {
        draft: mapBlock(s.draft, blockIdx, b => {
          // Copy the previous set's numbers so the next set is one tap away.
          const prev = b.sets.at(-1)
          const next = emptySet(prev ? { weight: prev.weight, reps: prev.reps, duration: prev.duration, distanceKm: prev.distanceKm } : undefined)
          return { ...b, sets: [...b.sets, next] }
        }),
      }
    }),

  updateSet: (blockIdx, setIdx, field, value) =>
    set(s => {
      if (!s.draft) return s
      return {
        draft: mapBlock(s.draft, blockIdx, b => ({
          ...b,
          sets: b.sets.map((st, j) => (j === setIdx ? { ...st, [field]: value } : st)),
        })),
      }
    }),

  toggleDone: (blockIdx, setIdx) => {
    const draft = get().draft
    const current = draft?.blocks[blockIdx]?.sets[setIdx]
    if (!draft || !current) return false
    const nowDone = !current.done
    set({
      draft: mapBlock(draft, blockIdx, b => ({
        ...b,
        sets: b.sets.map((st, j) => (j === setIdx ? { ...st, done: nowDone } : st)),
      })),
    })
    return nowDone
  },

  removeSet: (blockIdx, setIdx) =>
    set(s => {
      if (!s.draft) return s
      return { draft: mapBlock(s.draft, blockIdx, b => ({ ...b, sets: b.sets.filter((_, j) => j !== setIdx) })) }
    }),

  moveSet: (blockIdx, from, to) =>
    set(s => (s.draft ? { draft: mapBlock(s.draft, blockIdx, b => (b.sets[from] && b.sets[to] ? { ...b, sets: moved(b.sets, from, to) } : b)) } : s)),

  restoreSet: (blockIdx, setIdx, removed, exerciseId, startedAt) =>
    set(s => {
      if (!s.draft || s.draft.startedAt !== startedAt || s.draft.blocks[blockIdx]?.exercise.uuid !== exerciseId) return s
      return {
        draft: mapBlock(s.draft, blockIdx, b => {
          const sets = [...b.sets]
          sets.splice(Math.min(setIdx, sets.length), 0, removed)
          return { ...b, sets }
        }),
      }
    }),

  fillSets: (blockIdx, fill) =>
    set(s => (s.draft ? { draft: mapBlock(s.draft, blockIdx, b => ({ ...b, sets: applyFill(b.sets, fill) })) } : s)),

  markAllFilledDone: () =>
    set(s => {
      if (!s.draft) return s
      const blocks = s.draft.blocks.map(b => ({ ...b, sets: b.sets.map(st => (setHasValue(st) ? { ...st, done: true } : st)) }))
      return { draft: { ...s.draft, blocks } }
    }),
}))

// ── Persistence ────────────────────────────────────────────────────────────────
// The in-progress workout is mirrored to IndexedDB so a force-close, memory
// eviction (common on iOS) or refresh mid-workout doesn't lose it.

let persistTimer: ReturnType<typeof setTimeout> | null = null

useWorkoutStore.subscribe((state, prev) => {
  if (state.draft === prev.draft || !state.restored) return
  if (persistTimer) clearTimeout(persistTimer)
  const draft = state.draft
  persistTimer = setTimeout(() => {
    persistTimer = null
    void (async () => {
      try {
        if (!draft) {
          await db.workoutDrafts.delete(1)
          return
        }
        const existing = await db.workoutDrafts.get(1)
        await db.workoutDrafts.put({
          id: 1,
          draftJson: JSON.stringify(draft),
          restTimerEndAt: existing?.restTimerEndAt ?? null,
          updatedAt: Date.now(),
        })
      } catch {
        // best-effort
      }
    })()
  }, 200)
})

/** Load an in-progress workout from IndexedDB (call once at startup). */
export async function restoreDraftFromStorage(): Promise<void> {
  try {
    const row = await db.workoutDrafts.get(1)
    const draft = row?.draftJson ? (JSON.parse(row.draftJson) as WorkoutDraft) : null
    useWorkoutStore.setState({ draft: draft && Array.isArray(draft.blocks) ? draft : null, restored: true })
  } catch {
    useWorkoutStore.setState({ restored: true })
  }
}
