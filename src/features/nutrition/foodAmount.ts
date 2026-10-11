import type { Food } from '@/types'
import { round1 } from '@/lib/format'

/** Foods measured by weight or volume can be entered in grams / ml as well as in servings. */
export const usesGrams = (food: Food) => food.servingUnit === 'g' || food.servingUnit === 'ml'

export type AmountMode = 'servings' | 'grams'

/** The amount fields while typing: both kept, so switching between them loses nothing. */
export interface AmountDraft {
  mode: AmountMode
  servings: string
  grams: string
}

export const EMPTY_AMOUNT: AmountDraft = { mode: 'servings', servings: '1', grams: '' }

/** The fields for `servings` of a food, opening in grams where the food allows it. */
export function amountDraft(food: Food, servings: number): AmountDraft {
  return {
    mode: usesGrams(food) ? 'grams' : 'servings',
    servings: String(servings),
    grams: String(Math.round(servings * food.servingSize)),
  }
}

/** What the fields come to in servings (what a log stores). */
export function servingsOf(food: Food, draft: AmountDraft): number {
  if (draft.mode === 'grams' && usesGrams(food)) {
    const g = parseFloat(draft.grams)
    if (g > 0 && food.servingSize > 0) return g / food.servingSize
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
