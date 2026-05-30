import type { Food, FoodIngredient } from '@/types'

export interface MacroTotals {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

const ZERO: MacroTotals = { kcal: 0, protein: 0, carbs: 0, fat: 0 }

function isGramBased(food: Food): boolean {
  return food.servingUnit === 'g' || food.servingUnit === 'ml'
}

export function macrosForIngredient(
  ingredient: FoodIngredient,
  source: Food | undefined,
): MacroTotals {
  if (!source || source.servingSize <= 0) return ZERO
  const factor = isGramBased(source)
    ? ingredient.grams / source.servingSize
    : ingredient.grams / source.servingSize
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
    protein: Math.round(totals.protein * 10) / 10,
    carbs: Math.round(totals.carbs * 10) / 10,
    fat: Math.round(totals.fat * 10) / 10,
  }
}

export function totalGrams(ingredients: FoodIngredient[]): number {
  return ingredients.reduce((sum, i) => sum + (i.grams || 0), 0)
}
