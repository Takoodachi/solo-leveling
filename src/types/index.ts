export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface FoodIngredient {
  foodUuid: string
  grams: number
}

export interface Food {
  uuid: string
  name: string
  kcalPerServing: number
  protein: number // g
  carbs: number // g
  fat: number // g
  servingSize: number
  servingUnit: string
  isCustom: boolean
  isFavorite: boolean
  ingredients?: FoodIngredient[]
  notes?: string
  updatedAt: number
  syncPending?: boolean
}

export interface FoodLog {
  uuid: string
  date: string // YYYY-MM-DD
  foodId: string
  servings: number
  mealType: MealType
  updatedAt: number
  syncPending?: boolean
}

export interface BodyMetric {
  uuid: string
  date: string // YYYY-MM-DD
  weightKg: number
  notes?: string
  updatedAt: number
  syncPending?: boolean
}

export interface UserStats {
  id: 1
  xp: number
  level: number
  currentStreak: number
  longestStreak: number
  lastLogDate: string | null // YYYY-MM-DD
  streakFreezes: number
  updatedAt?: number
  syncPending?: boolean
}

export interface Targets {
  id: 1
  dailyKcal: number
  dailyProtein: number // g
  dailyCarbs: number // g
  dailyFat: number // g
  updatedAt: number
  syncPending?: boolean
}

export interface Achievement {
  uuid: string
  key: string
  unlockedAt: number
  progress: number
  updatedAt: number
  syncPending?: boolean
}

export interface Settings {
  id: 1
  heightCm?: number
  sex?: 'male' | 'female'
  goalType?: 'cut' | 'maintain' | 'bulk'
  dynamicTargetsEnabled?: boolean
  activityWindowDays?: number // 3-7
  updatedAt?: number
  syncPending?: boolean
}

export interface DailyActivity {
  uuid: string
  date: string // YYYY-MM-DD
  steps: number
  updatedAt: number
  syncPending?: boolean
}

// View types (not stored, derived from joins)
export interface FoodLogWithFood extends FoodLog {
  food: Food
}

export interface DailyNutrition {
  kcal: number
  protein: number
  carbs: number
  fat: number
}
