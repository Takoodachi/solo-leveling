import type { Food } from '@/types'
import { QUICK_ADD_FOOD } from '@/data/basics'
import { round1 } from '@/lib/format'

/** Calories logged on their own (see `QUICK_ADD_FOOD`). */
export const isQuickAdd = (food: Pick<Food, 'uuid'>) => food.uuid === QUICK_ADD_FOOD.uuid

/**
 * Foods entered as an amount: those measured by weight or volume (grams / ml, or servings if
 * preferred), and a quick add, whose amount is its calories.
 */
export const usesGrams = (food: Food) => food.servingUnit === 'g' || food.servingUnit === 'ml' || isQuickAdd(food)

export type AmountMode = 'servings' | 'grams' | 'oz'

/** An ounce in the food's own unit: by weight for grams, fluid for ml. */
const OZ: Record<string, number> = { g: 28.3495, ml: 29.5735 }

/** Foods that can be entered in ounces: those measured in g or ml (not a quick add). */
export const usesOz = (food: Food) => food.servingUnit in OZ
export const ozLabel = (food: Food) => (food.servingUnit === 'ml' ? 'fl oz' : 'oz')
export const ozOf = (food: Food, servings: number) => round1((servings * food.servingSize) / OZ[food.servingUnit])

const UNIT_KEY = 'solo:amountUnit'

/** Grams or ounces, whichever was picked last on this device. */
export function preferredUnit(): 'grams' | 'oz' {
  try {
    return localStorage.getItem(UNIT_KEY) === 'oz' ? 'oz' : 'grams'
  } catch {
    return 'grams'
  }
}

export function rememberUnit(mode: AmountMode): void {
  if (mode === 'servings') return
  try {
    localStorage.setItem(UNIT_KEY, mode)
  } catch {
    // storage unavailable: grams next time
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

/** The fields for `servings` of a food, opening in grams (or ounces, if those were picked last) where the food allows it. */
export function amountDraft(food: Food, servings: number): AmountDraft {
  return {
    mode: usesOz(food) ? preferredUnit() : usesGrams(food) ? 'grams' : 'servings',
    servings: String(servings),
    grams: String(Math.round(servings * food.servingSize)),
    oz: usesOz(food) ? String(ozOf(food, servings)) : '',
  }
}

/** What the fields come to in servings (what a log stores). */
export function servingsOf(food: Food, draft: AmountDraft): number {
  if (draft.mode === 'grams' && usesGrams(food)) {
    const g = parseFloat(draft.grams)
    if (g > 0 && food.servingSize > 0) return g / food.servingSize
  }
  if (draft.mode === 'oz' && usesOz(food)) {
    const oz = parseFloat(draft.oz)
    if (oz > 0 && food.servingSize > 0) return (oz * OZ[food.servingUnit]) / food.servingSize
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
