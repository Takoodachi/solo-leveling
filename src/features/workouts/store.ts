import { create } from 'zustand'
import { db } from '@/db'
import type { Exercise } from '@/types'
import { type WorkoutDraft, type SetDraft, type LastSet, emptySet, setHasValue } from './types'

type SetField = keyof Omit<SetDraft, 'uuid' | 'done'>

interface WorkoutStore {
  draft: WorkoutDraft | null
  /** True once we've checked IndexedDB for an in-progress workout. */
  restored: boolean

  start: (draft: WorkoutDraft) => void
  discard: () => void
  rename: (name: string) => void
  setNotes: (notes: string) => void

  addBlock: (exercise: Exercise, opts?: { restSec?: number; lastSets?: LastSet[] }) => void
  removeBlock: (blockIdx: number) => void
  moveBlock: (blockIdx: number, delta: -1 | 1) => void

  addSet: (blockIdx: number) => void
  updateSet: (blockIdx: number, setIdx: number, field: SetField, value: string) => void
  toggleDone: (blockIdx: number, setIdx: number) => boolean
  removeSet: (blockIdx: number, setIdx: number) => void
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
      const first = emptySet({
        weight: last?.weight != null ? String(last.weight) : '',
        reps: last?.reps != null ? String(last.reps) : '',
      })
      return {
        draft: {
          ...s.draft,
          blocks: [...s.draft.blocks, { exercise, restSec: opts?.restSec ?? 90, sets: [first], lastSets: opts?.lastSets }],
        },
      }
    }),

  removeBlock: blockIdx =>
    set(s => (s.draft ? { draft: { ...s.draft, blocks: s.draft.blocks.filter((_, i) => i !== blockIdx) } } : s)),

  moveBlock: (blockIdx, delta) =>
    set(s => {
      if (!s.draft) return s
      const to = blockIdx + delta
      if (to < 0 || to >= s.draft.blocks.length) return s
      const blocks = [...s.draft.blocks]
      ;[blocks[blockIdx], blocks[to]] = [blocks[to], blocks[blockIdx]]
      return { draft: { ...s.draft, blocks } }
    }),

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
