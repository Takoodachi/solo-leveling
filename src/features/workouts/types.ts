import type { Exercise, ExerciseType } from '@/types'

export type SetDraft = {
  uuid: string
  reps: string
  weight: string
  rpe: string
  duration: string // seconds as string
  distanceKm: string
}

export type BlockDraft = {
  exercise: Exercise
  sets: SetDraft[]
}

export type WorkoutDraft = {
  startedAt: number
  notes: string
  blocks: BlockDraft[]
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
