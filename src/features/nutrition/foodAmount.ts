import type { Food } from '@/types'
import { QUICK_ADD_FOOD } from '@/data/basics'
import { round1 } from '@/lib/format'

/** Calories logged on their own (see `QUICK_ADD_FOOD`). */
export const isQuickAdd = (food: Pick<Food, 'uuid'>) => food.uuid === QUICK_ADD_FOOD.uuid

/** An ounce in grams, and a fluid ounce in ml. */
const OZ = { g: 28.3495, ml: 29.5735 } as const
type Metric = keyof typeof OZ

const UNITS: Record<string, string> = {
  g: 'g', gram: 'g', grams: 'g', ml: 'ml', oz: 'oz', ounce: 'oz', ounces: 'oz',
  'fl oz': 'fl oz', floz: 'fl oz', 'fluid ounce': 'fl oz', 'fluid ounces': 'fl oz',
}

/** A unit as typed ("Oz", "fl. oz", "grams", "mL") in the form the amounts know; any other unit as it was. */
export function normalUnit(unit: string): string {
  return UNITS[unit.trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ')] ?? unit.trim()
}

/**
 * What one serving weighs (g) or holds (ml), where that's known: from the food's own unit (g, ml,
 * oz, fl oz), else from the catalog's weight for a portion such as a bowl (`servingGrams`, `servingMl`).
 */
export function measureOf(food: Food): { unit: Metric; per: number } | null {
  const unit = normalUnit(food.servingUnit)
  if (unit === 'g' || unit === 'ml') return { unit, per: food.servingSize }
  if (unit === 'oz') return { unit: 'g', per: food.servingSize * OZ.g }
  if (unit === 'fl oz') return { unit: 'ml', per: food.servingSize * OZ.ml }
  if (food.servingMl) return { unit: 'ml', per: food.servingMl }
  if (food.servingGrams) return { unit: 'g', per: food.servingGrams }
  return null
}

/**
 * Foods entered as an amount first: those measured in a weight or volume (g, ml, oz, fl oz), and a
 * quick add, whose amount is its calories. A portion food (a bowl) opens in servings.
 */
export const usesGrams = (food: Food) => ['g', 'ml', 'oz', 'fl oz'].includes(normalUnit(food.servingUnit)) || isQuickAdd(food)

export type AmountMode = 'servings' | 'grams' | 'oz'

/** Foods that can be entered in grams and ounces: every food whose serving's weight or volume is known (not a quick add). */
export const usesOz = (food: Food) => measureOf(food) != null
export const ozLabel = (food: Food) => (measureOf(food)?.unit === 'ml' ? 'fl oz' : 'oz')
/** The metric unit for the "grams" field: g or ml, or a quick add's own unit (calories). */
export const metricLabel = (food: Food) => (isQuickAdd(food) ? food.servingUnit : measureOf(food)?.unit ?? food.servingUnit)
export function ozOf(food: Food, servings: number): number {
  const m = measureOf(food)
  return m ? round1((servings * m.per) / OZ[m.unit]) : 0
}
const metricPer = (food: Food) => (isQuickAdd(food) ? food.servingSize : measureOf(food)?.per)
export const metricOf = (food: Food, servings: number) => Math.round(servings * (metricPer(food) ?? food.servingSize))

const UNIT_KEY = 'solo:amountUnit'

/** Grams or ounces for this food: whichever was picked last on this device, else what the food is measured in. */
export function unitFor(food: Food): 'grams' | 'oz' {
  try {
    const picked = localStorage.getItem(UNIT_KEY)
    if (picked === 'oz' || picked === 'grams') return picked
  } catch {
    // storage unavailable: go by the food
  }
  return normalUnit(food.servingUnit).endsWith('oz') ? 'oz' : 'grams'
}

export function rememberUnit(mode: AmountMode): void {
  if (mode === 'servings') return
  try {
    localStorage.setItem(UNIT_KEY, mode)
  } catch {
    // storage unavailable: the food's own unit next time
  }
}

/** The amount fields while typing: both kept, so switching between them loses nothing. */
export interface AmountDraft {
  mode: AmountMode
  servings: string
  grams: string
  oz: string
}

export const EMPTY_AMOUNT: AmountDraft = { mode: 'servings', servings: '1', grams: '', oz: '' }

/** The fields for `servings` of a food, opening in grams or ounces (whichever was picked last) for a food measured by weight or volume. */
export function amountDraft(food: Food, servings: number): AmountDraft {
  return {
    mode: isQuickAdd(food) ? 'grams' : usesGrams(food) ? unitFor(food) : 'servings',
    servings: String(servings),
    grams: String(metricOf(food, servings)),
    oz: usesOz(food) ? String(ozOf(food, servings)) : '',
  }
}

/** What the fields come to in servings (what a log stores). */
export function servingsOf(food: Food, draft: AmountDraft): number {
  const per = metricPer(food)
  if (draft.mode === 'grams' && per) {
    const g = parseFloat(draft.grams)
    if (g > 0) return g / per
  }
  const m = measureOf(food)
  if (draft.mode === 'oz' && m && m.per > 0) {
    const oz = parseFloat(draft.oz)
    if (oz > 0) return (oz * OZ[m.unit]) / m.per
  }
  return Math.max(0.1, parseFloat(draft.servings) || 1)
}

export function computeMacros(food: Food, servings: number) {
  return {
    kcal: Math.round(food.kcalPerServing * servings),
    protein: round1(food.protein * servings),
    carbs: round1(food.carbs * servings),
    fat: round1(food.fat * servings),
  }
}
