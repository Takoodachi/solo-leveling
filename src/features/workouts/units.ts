import type { WeightUnit } from '@/types'
import { parsePositive, type LastSet } from './types'

/**
 * Weights are stored, rated and charted in kg. An exercise can be *logged* in pounds instead
 * (plates or a stack marked that way; `ExerciseNote.unit`): its logger card then shows and takes
 * lb, and every number crossing into or out of the card goes through here.
 */

const KG_PER_LB = 0.45359237
const tidy = (n: number, places: number) => Math.round(n * 10 ** places) / 10 ** places

export const isLb = (unit: WeightUnit | null | undefined): unit is 'lb' => unit === 'lb'
export const otherUnit = (unit: WeightUnit | null | undefined): WeightUnit => (isLb(unit) ? 'kg' : 'lb')

/** A weight typed in the card, as it's stored. */
export function toKg(value: number, unit: WeightUnit | null | undefined): number {
  return isLb(unit) ? tidy(value * KG_PER_LB, 2) : value
}

/**
 * A stored weight, as the card shows it. In lb it's the shortest number that stores back to the
 * same kg, so 135 lb comes back as 135 (not 134.99) and 60 kg survives a look at it in pounds.
 */
export function fromKg(kg: number, unit: WeightUnit | null | undefined): number {
  if (!isLb(unit)) return kg
  const stored = tidy(kg, 2)
  for (const places of [0, 1]) {
    const lb = tidy(kg / KG_PER_LB, places)
    if (toKg(lb, 'lb') === stored) return lb
  }
  return tidy(kg / KG_PER_LB, 2)
}

/** A gap between two weights (a plate jump) in the card's unit. */
export const stepFromKg = (kg: number, unit: WeightUnit | null | undefined) => (isLb(unit) ? tidy(kg / KG_PER_LB, 1) : kg)

/** A weight field's text as kg; undefined when it's empty. */
export function weightKg(text: string, unit: WeightUnit | null | undefined): number | undefined {
  const value = parsePositive(text)
  return value == null ? undefined : toKg(value, unit)
}

/** The text for a weight field holding `kg`. */
export const weightText = (kg: number | undefined, unit: WeightUnit | null | undefined) => (kg != null ? String(fromKg(kg, unit)) : '')

/** What a weight field reads after its card switches units: the same weight, not the same number. */
export function convertWeightText(text: string, from: WeightUnit | null | undefined, to: WeightUnit): string {
  const value = parsePositive(text)
  if (value == null || isLb(from) === isLb(to)) return text
  return String(fromKg(toKg(value, from), to))
}

/** Last time's sets with their weights in the card's unit ("Previous" column, progression hint). */
export function lastSetsIn(sets: LastSet[] | undefined, unit: WeightUnit | null | undefined): LastSet[] | undefined {
  if (!sets || !isLb(unit)) return sets
  return sets.map(s => (s.weight != null ? { ...s, weight: fromKg(s.weight, unit) } : s))
}

/** Draft sets with their weight text in kg, for what only knows kg (rank scoring). */
export function setsInKg<T extends { weight: string }>(sets: T[], unit: WeightUnit | null | undefined): T[] {
  if (!isLb(unit)) return sets
  return sets.map(s => ({ ...s, weight: weightKg(s.weight, unit)?.toString() ?? '' }))
}
