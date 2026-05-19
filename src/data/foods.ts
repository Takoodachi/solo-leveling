import type { Food } from '@/types'

const NOW = 0

export const BUILT_IN_FOODS: Food[] = [
  // ── Protein sources ──────────────────────────────────────────────
  { uuid: 'food-chicken-breast',    name: 'Chicken Breast (cooked)',     kcalPerServing: 165, protein: 31,   carbs: 0,   fat: 3.6,  servingSize: 100, servingUnit: 'g',    isCustom: false, isFavorite: false, updatedAt: NOW },
  { uuid: 'food-egg-large',         name: 'Egg (large)',                 kcalPerServing: 72,  protein: 6.3,  carbs: 0.4, fat: 5,    servingSize: 1,   servingUnit: 'egg',  isCustom: false, isFavorite: false, updatedAt: NOW },
  { uuid: 'food-greek-yogurt',      name: 'Greek Yogurt (plain)',        kcalPerServing: 59,  protein: 10,   carbs: 3.6, fat: 0.4,  servingSize: 100, servingUnit: 'g',    isCustom: false, isFavorite: false, updatedAt: NOW },
  { uuid: 'food-canned-tuna',       name: 'Canned Tuna (in water)',      kcalPerServing: 110, protein: 25,   carbs: 0,   fat: 0.8,  servingSize: 100, servingUnit: 'g',    isCustom: false, isFavorite: false, updatedAt: NOW },
  { uuid: 'food-salmon',            name: 'Salmon Fillet',               kcalPerServing: 208, protein: 20,   carbs: 0,   fat: 13,   servingSize: 100, servingUnit: 'g',    isCustom: false, isFavorite: false, updatedAt: NOW },
  { uuid: 'food-ground-beef',       name: 'Ground Beef (90% lean)',      kcalPerServing: 172, protein: 22,   carbs: 0,   fat: 9,    servingSize: 100, servingUnit: 'g',    isCustom: false, isFavorite: false, updatedAt: NOW },
  { uuid: 'food-cottage-cheese',    name: 'Cottage Cheese (low-fat)',    kcalPerServing: 72,  protein: 12,   carbs: 4,   fat: 1,    servingSize: 100, servingUnit: 'g',    isCustom: false, isFavorite: false, updatedAt: NOW },
  { uuid: 'food-whey-protein',      name: 'Whey Protein (1 scoop)',      kcalPerServing: 120, protein: 24,   carbs: 3,   fat: 2,    servingSize: 30,  servingUnit: 'g',    isCustom: false, isFavorite: false, updatedAt: NOW },

  // ── Carb sources ──────────────────────────────────────────────────
  { uuid: 'food-white-rice',        name: 'White Rice (cooked)',         kcalPerServing: 130, protein: 2.7,  carbs: 28,  fat: 0.3,  servingSize: 100, servingUnit: 'g',    isCustom: false, isFavorite: false, updatedAt: NOW },
  { uuid: 'food-brown-rice',        name: 'Brown Rice (cooked)',         kcalPerServing: 112, protein: 2.3,  carbs: 24,  fat: 0.9,  servingSize: 100, servingUnit: 'g',    isCustom: false, isFavorite: false, updatedAt: NOW },
  { uuid: 'food-rolled-oats',       name: 'Rolled Oats (dry)',           kcalPerServing: 389, protein: 17,   carbs: 66,  fat: 7,    servingSize: 100, servingUnit: 'g',    isCustom: false, isFavorite: false, updatedAt: NOW },
  { uuid: 'food-white-bread',       name: 'White Bread (1 slice)',       kcalPerServing: 75,  protein: 2.5,  carbs: 14,  fat: 1,    servingSize: 28,  servingUnit: 'g',    isCustom: false, isFavorite: false, updatedAt: NOW },
  { uuid: 'food-banana',            name: 'Banana (medium)',             kcalPerServing: 107, protein: 1.3,  carbs: 27,  fat: 0.4,  servingSize: 120, servingUnit: 'g',    isCustom: false, isFavorite: false, updatedAt: NOW },
  { uuid: 'food-apple',             name: 'Apple (medium)',              kcalPerServing: 95,  protein: 0.5,  carbs: 25,  fat: 0.3,  servingSize: 182, servingUnit: 'g',    isCustom: false, isFavorite: false, updatedAt: NOW },
  { uuid: 'food-sweet-potato',      name: 'Sweet Potato (cooked)',       kcalPerServing: 90,  protein: 2,    carbs: 21,  fat: 0.1,  servingSize: 100, servingUnit: 'g',    isCustom: false, isFavorite: false, updatedAt: NOW },
  { uuid: 'food-pasta-cooked',      name: 'Pasta (cooked)',              kcalPerServing: 131, protein: 5,    carbs: 25,  fat: 1.1,  servingSize: 100, servingUnit: 'g',    isCustom: false, isFavorite: false, updatedAt: NOW },

  // ── Fats ──────────────────────────────────────────────────────────
  { uuid: 'food-avocado',           name: 'Avocado',                     kcalPerServing: 160, protein: 2,    carbs: 9,   fat: 15,   servingSize: 100, servingUnit: 'g',    isCustom: false, isFavorite: false, updatedAt: NOW },
  { uuid: 'food-almonds',           name: 'Almonds',                     kcalPerServing: 174, protein: 6,    carbs: 6,   fat: 15,   servingSize: 30,  servingUnit: 'g',    isCustom: false, isFavorite: false, updatedAt: NOW },
  { uuid: 'food-olive-oil',         name: 'Olive Oil (1 tbsp)',          kcalPerServing: 119, protein: 0,    carbs: 0,   fat: 13.5, servingSize: 14,  servingUnit: 'g',    isCustom: false, isFavorite: false, updatedAt: NOW },
  { uuid: 'food-peanut-butter',     name: 'Peanut Butter (2 tbsp)',      kcalPerServing: 188, protein: 8,    carbs: 7,   fat: 16,   servingSize: 32,  servingUnit: 'g',    isCustom: false, isFavorite: false, updatedAt: NOW },
  { uuid: 'food-whole-milk',        name: 'Whole Milk (240ml)',          kcalPerServing: 149, protein: 8,    carbs: 12,  fat: 8,    servingSize: 240, servingUnit: 'ml',   isCustom: false, isFavorite: false, updatedAt: NOW },
  { uuid: 'food-cheddar-cheese',    name: 'Cheddar Cheese',              kcalPerServing: 114, protein: 7,    carbs: 0.4, fat: 9.4,  servingSize: 30,  servingUnit: 'g',    isCustom: false, isFavorite: false, updatedAt: NOW },

  // ── Vegetables ────────────────────────────────────────────────────
  { uuid: 'food-broccoli',          name: 'Broccoli (cooked)',           kcalPerServing: 35,  protein: 2.4,  carbs: 7.2, fat: 0.4,  servingSize: 100, servingUnit: 'g',    isCustom: false, isFavorite: false, updatedAt: NOW },
  { uuid: 'food-spinach',           name: 'Spinach (raw)',               kcalPerServing: 23,  protein: 2.9,  carbs: 3.6, fat: 0.4,  servingSize: 100, servingUnit: 'g',    isCustom: false, isFavorite: false, updatedAt: NOW },
  { uuid: 'food-carrot',            name: 'Carrot (raw)',                kcalPerServing: 41,  protein: 0.9,  carbs: 10,  fat: 0.2,  servingSize: 100, servingUnit: 'g',    isCustom: false, isFavorite: false, updatedAt: NOW },
  { uuid: 'food-tomato',            name: 'Tomato',                      kcalPerServing: 18,  protein: 0.9,  carbs: 3.9, fat: 0.2,  servingSize: 100, servingUnit: 'g',    isCustom: false, isFavorite: false, updatedAt: NOW },
  { uuid: 'food-cucumber',          name: 'Cucumber',                    kcalPerServing: 16,  protein: 0.7,  carbs: 3.6, fat: 0.1,  servingSize: 100, servingUnit: 'g',    isCustom: false, isFavorite: false, updatedAt: NOW },
  { uuid: 'food-bell-pepper',       name: 'Bell Pepper (red)',           kcalPerServing: 31,  protein: 1,    carbs: 6,   fat: 0.3,  servingSize: 100, servingUnit: 'g',    isCustom: false, isFavorite: false, updatedAt: NOW },

  // ── Convenience ───────────────────────────────────────────────────
  { uuid: 'food-protein-bar',       name: 'Protein Bar (generic)',       kcalPerServing: 230, protein: 20,   carbs: 25,  fat: 8,    servingSize: 60,  servingUnit: 'g',    isCustom: false, isFavorite: false, updatedAt: NOW },
  { uuid: 'food-ww-tortilla',       name: 'Whole Wheat Tortilla',        kcalPerServing: 130, protein: 3,    carbs: 22,  fat: 3,    servingSize: 45,  servingUnit: 'g',    isCustom: false, isFavorite: false, updatedAt: NOW },
]
