import type { Food } from '@/types'

/**
 * The little of the catalog the screens need. The catalog itself (foods.ts, exercises.ts and
 * their second halves, about 120 KB) is only loaded when it has to be written to the database
 * (db/seed.ts), so nothing a screen imports may come from those files: it would pull all of
 * them into the code every launch has to read.
 */

/**
 * "Quick add": calories logged on their own, with no food behind them. It's a food of 1 kcal
 * per serving, so a log of 350 servings is 350 kcal and nothing else changes: totals, sync,
 * saved meals and copy-a-day all see an ordinary food log. It's kept out of every food list.
 */
export const QUICK_ADD_FOOD: Food = {
  uuid: 'food-quick-add', name: 'Quick add', kcalPerServing: 1, protein: 0, carbs: 0, fat: 0,
  servingSize: 1, servingUnit: 'kcal', isCustom: false, isFavorite: false, updatedAt: 0,
}

export const EXERCISE_CATEGORIES = [
  'Back', 'Chest', 'Shoulders', 'Arms', 'Lower Body', 'Core', 'Full Body', 'Cardio', 'Mobility',
] as const
