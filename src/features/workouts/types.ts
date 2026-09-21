import type { Exercise, RoutineCategory } from '@/types'

/** One set row in the live logger. Inputs are strings while editing. */
export type SetDraft = {
  uuid: string
  weight: string
  reps: string
  duration: string // minutes
  distanceKm: string
  done: boolean
}

/** A set from the previous session of the same exercise ("Previous" column). */
export type LastSet = {
  weight?: number
  reps?: number
  duration?: number
  distanceKm?: number
}

export type BlockDraft = {
  exercise: Exercise
  restSec: number
  targetReps?: number
  sets: SetDraft[]
  lastSets?: LastSet[]
}

export type WorkoutDraft = {
  startedAt: number
  name: string
  routineId?: string
  category?: RoutineCategory
  notes: string
  blocks: BlockDraft[]
}

export function emptySet(prefill?: Partial<SetDraft>): SetDraft {
  return { uuid: crypto.randomUUID(), weight: '', reps: '', duration: '', distanceKm: '', done: false, ...prefill }
}

export function setHasValue(s: SetDraft): boolean {
  return [s.weight, s.reps, s.duration, s.distanceKm].some(v => v.trim() !== '' && Number(v) > 0)
}
