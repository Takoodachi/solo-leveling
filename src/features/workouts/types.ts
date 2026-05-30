import type { Exercise, ExerciseType } from '@/types'

export type SetDraft = {
  uuid: string
  reps: string
  weight: string
  rpe: string
  duration: string // seconds as string
  distanceKm: string
}

export type ExerciseSuggestion = {
  source: 'history' | 'related'
  weight?: number
  reps?: number
  sourceExerciseName?: string
  lastDate?: string
}

export type BlockDraft = {
  exercise: Exercise
  sets: SetDraft[]
  suggestion?: ExerciseSuggestion
}

export type WorkoutDraft = {
  startedAt: number
  notes: string
  blocks: BlockDraft[]
  // Present only for the "log past workout" flow
  date?: string          // YYYY-MM-DD
  durationMin?: number   // user-entered, required when date is set
}

export function emptySet(): SetDraft {
  return { uuid: crypto.randomUUID(), reps: '', weight: '', rpe: '', duration: '', distanceKm: '' }
}

export function defaultSetFor(_type: ExerciseType): SetDraft {
  return emptySet()
}

export function isCardio(type: ExerciseType): boolean {
  return type === 'cardio'
}
