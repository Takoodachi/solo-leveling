import { create } from 'zustand'
import type { Exercise } from '@/types'
import { type WorkoutDraft, type BlockDraft, type ExerciseSuggestion, type LastSet, emptySet } from './types'

interface WorkoutStore {
  draft: WorkoutDraft | null

  startWorkout: () => void
  startLogWorkout: (date: string, durationMin?: number) => void
  loadDraft: (draft: WorkoutDraft) => void
  discardWorkout: () => void
  setDraftDate: (date: string) => void
  setDraftDuration: (min: number | undefined) => void

  addBlock: (exercise: Exercise) => void
  removeBlock: (blockIdx: number) => void
  applySuggestionToBlock: (blockIdx: number, suggestion: ExerciseSuggestion) => void
  setBlockLastSessionSets: (blockIdx: number, lastSessionSets: LastSet[]) => void

  addSet: (blockIdx: number) => void
  updateSet: (blockIdx: number, setIdx: number, field: keyof Omit<import('./types').SetDraft, 'uuid'>, value: string) => void
  removeSet: (blockIdx: number, setIdx: number) => void

  updateNotes: (notes: string) => void
}

export const useWorkoutStore = create<WorkoutStore>((set) => ({
  draft: null,

  startWorkout: () =>
    set({
      draft: {
        startedAt: Date.now(),
        notes: '',
        blocks: [],
      },
    }),

  startLogWorkout: (date, durationMin = 45) =>
    set({
      draft: {
        startedAt: Date.now(),
        notes: '',
        blocks: [],
        date,
        durationMin,
      },
    }),

  loadDraft: (draft) => set({ draft }),

  discardWorkout: () => set({ draft: null }),

  setDraftDate: (date) =>
    set((state) => {
      if (!state.draft) return state
      return { draft: { ...state.draft, date } }
    }),

  setDraftDuration: (min) =>
    set((state) => {
      if (!state.draft) return state
      return { draft: { ...state.draft, durationMin: min } }
    }),

  addBlock: (exercise) =>
    set((state) => {
      if (!state.draft) return state
      const newBlock: BlockDraft = { exercise, sets: [emptySet()] }
      return { draft: { ...state.draft, blocks: [...state.draft.blocks, newBlock] } }
    }),

  removeBlock: (blockIdx) =>
    set((state) => {
      if (!state.draft) return state
      const blocks = state.draft.blocks.filter((_, i) => i !== blockIdx)
      return { draft: { ...state.draft, blocks } }
    }),

  applySuggestionToBlock: (blockIdx, suggestion) =>
    set((state) => {
      if (!state.draft) return state
      const blocks = state.draft.blocks.map((block, i) => {
        if (i !== blockIdx) return block
        // Only prefill the first set, and only if it's still empty (don't clobber user edits)
        const sets = block.sets.map((s, j) => {
          if (j !== 0) return s
          if (s.weight || s.reps) return s
          return {
            ...s,
            weight: suggestion.weight != null ? String(suggestion.weight) : s.weight,
            reps: suggestion.reps != null ? String(suggestion.reps) : s.reps,
          }
        })
        return { ...block, suggestion, sets }
      })
      return { draft: { ...state.draft, blocks } }
    }),

  setBlockLastSessionSets: (blockIdx, lastSessionSets) =>
    set((state) => {
      if (!state.draft) return state
      const blocks = state.draft.blocks.map((block, i) =>
        i === blockIdx ? { ...block, lastSessionSets } : block,
      )
      return { draft: { ...state.draft, blocks } }
    }),

  addSet: (blockIdx) =>
    set((state) => {
      if (!state.draft) return state
      const blocks = state.draft.blocks.map((block, i) => {
        if (i !== blockIdx) return block
        const lastSet = block.sets.at(-1)
        const newSet = lastSet
          ? { ...lastSet, uuid: crypto.randomUUID() }
          : emptySet()
        return { ...block, sets: [...block.sets, newSet] }
      })
      return { draft: { ...state.draft, blocks } }
    }),

  updateSet: (blockIdx, setIdx, field, value) =>
    set((state) => {
      if (!state.draft) return state
      const blocks = state.draft.blocks.map((block, i) => {
        if (i !== blockIdx) return block
        const sets = block.sets.map((s, j) =>
          j === setIdx ? { ...s, [field]: value } : s
        )
        return { ...block, sets }
      })
      return { draft: { ...state.draft, blocks } }
    }),

  removeSet: (blockIdx, setIdx) =>
    set((state) => {
      if (!state.draft) return state
      const blocks = state.draft.blocks.map((block, i) => {
        if (i !== blockIdx) return block
        const sets = block.sets.filter((_, j) => j !== setIdx)
        return { ...block, sets }
      })
      return { draft: { ...state.draft, blocks } }
    }),

  updateNotes: (notes) =>
    set((state) => {
      if (!state.draft) return state
      return { draft: { ...state.draft, notes } }
    }),
}))

// ── Persistence layer ────────────────────────────────────────────────
// We persist the active draft to Dexie on every change so a force-close,
// memory eviction, or accidental refresh during a workout doesn't lose the
// in-progress state. Cleared explicitly on save/discard.
import { db } from '@/db'

let persistTimer: ReturnType<typeof setTimeout> | null = null

function schedulePersist(draft: WorkoutDraft | null): void {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    persistTimer = null
    void doPersist(draft)
  }, 200)
}

async function doPersist(draft: WorkoutDraft | null): Promise<void> {
  try {
    if (draft == null) {
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
}

useWorkoutStore.subscribe((state, prev) => {
  if (state.draft === prev.draft) return
  schedulePersist(state.draft)
})

export async function restoreDraftFromStorage(): Promise<boolean> {
  try {
    const row = await db.workoutDrafts.get(1)
    if (!row?.draftJson) return false
    const draft = JSON.parse(row.draftJson) as WorkoutDraft
    if (!draft || typeof draft !== 'object') return false
    useWorkoutStore.getState().loadDraft(draft)
    return true
  } catch {
    return false
  }
}
