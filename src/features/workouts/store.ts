import { create } from 'zustand'
import type { Exercise } from '@/types'
import { type WorkoutDraft, type BlockDraft, emptySet } from './types'

interface WorkoutStore {
  draft: WorkoutDraft | null

  startWorkout: () => void
  loadDraft: (draft: WorkoutDraft) => void
  discardWorkout: () => void

  addBlock: (exercise: Exercise) => void
  removeBlock: (blockIdx: number) => void

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

  loadDraft: (draft) => set({ draft }),

  discardWorkout: () => set({ draft: null }),

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
