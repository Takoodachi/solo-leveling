import type { Food, FoodIngredient } from '@/types'
import { round1 } from './format'

export interface MacroTotals {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

const ZERO: MacroTotals = { kcal: 0, protein: 0, carbs: 0, fat: 0 }

export function macrosForIngredient(
  ingredient: FoodIngredient,
  source: Food | undefined,
): MacroTotals {
  if (!source || source.servingSize <= 0) return ZERO
  // For a food measured in servings the amount counts as servings (the picker says so)
  const factor = ingredient.grams / source.servingSize
  return {
    kcal: source.kcalPerServing * factor,
    protein: source.protein * factor,
    carbs: source.carbs * factor,
    fat: source.fat * factor,
  }
}

export function macrosFromIngredients(
  ingredients: FoodIngredient[],
  lookup: (uuid: string) => Food | undefined,
): MacroTotals {
  const totals = ingredients.reduce<MacroTotals>((acc, ing) => {
    const m = macrosForIngredient(ing, lookup(ing.foodUuid))
    return {
      kcal: acc.kcal + m.kcal,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }
  }, ZERO)

  return {
    kcal: Math.round(totals.kcal),
    protein: round1(totals.protein),
    carbs: round1(totals.carbs),
    fat: round1(totals.fat),
  }
}

export function totalGrams(ingredients: FoodIngredient[]): number {
  return ingredients.reduce((sum, i) => sum + (i.grams || 0), 0)
}
