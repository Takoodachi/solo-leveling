import type { Exercise, RoutineCategory } from '@/types'
import type { Intensity } from '@/lib/cardio'

/** One set row in the live logger. Inputs are strings while editing. */
export type SetDraft = {
  uuid: string
  weight: string
  reps: string
  duration: string // minutes
  distanceKm: string
  /** Cardio effort (saved as rpe). */
  intensity?: Intensity
  done: boolean
}

/** A set from the previous session of the same exercise ("Previous" column). */
export type LastSet = {
  weight?: number
  reps?: number
  duration?: number
  distanceKm?: number
  rpe?: number
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

/** Accept "12", "12.5" and "12,5" while typing. */
export function sanitizeNumeric(v: string): string {
  const cleaned = v.replace(',', '.').replace(/[^\d.]/g, '')
  const [int, ...rest] = cleaned.split('.')
  return rest.length ? `${int}.${rest.join('')}` : int
}

/** Parse a draft field; undefined when empty or not positive. */
export function parsePositive(v: string): number | undefined {
  const n = Number(v.replace(',', '.'))
  return v.trim() !== '' && Number.isFinite(n) && n > 0 ? n : undefined
}

export function setHasValue(s: SetDraft): boolean {
  return [s.weight, s.reps, s.duration, s.distanceKm].some(v => v.trim() !== '' && Number(v) > 0)
}
