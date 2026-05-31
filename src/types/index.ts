export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type ExerciseType = 'strength' | 'cardio' | 'bodyweight' | 'flexibility'
export type PrMetric = 'maxWeight' | 'maxReps' | 'maxVolume' | 'max1RM'

export interface Exercise {
  uuid: string
  name: string
  category: string
  type: ExerciseType
  defaultUnit: 'kg' | 'lb' | 'min' | 'reps' | 'km'
  isCustom: boolean
  muscles?: string[]
  musclesSecondary?: string[]
  wgerId?: number
  instructions?: string
  updatedAt: number
  syncPending?: boolean
}

export interface Workout {
  uuid: string
  date: string // YYYY-MM-DD
  notes: string
  durationMin: number
  createdAt: number
  updatedAt: number
  syncPending?: boolean
}

export interface WorkoutSet {
  uuid: string
  workoutId: string
  exerciseId: string
  setIndex: number
  reps?: number
  weight?: number // kg
  duration?: number // seconds
  distanceKm?: number
  rpe?: number // 1-10
  updatedAt: number
  syncPending?: boolean
}

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

export interface PrRecord {
  uuid: string
  exerciseId: string
  metric: PrMetric
  value: number
  achievedAt: number
  updatedAt: number
  syncPending?: boolean
}

export interface Settings {
  id: 1
  defaultRestSeconds: number
  barWeightKg: number
  heightCm?: number
  sex?: 'male' | 'female'
  goalType?: 'cut' | 'maintain' | 'bulk'
  dynamicTargetsEnabled?: boolean
  activityWindowDays?: number // 3-7
}

export interface DailyActivity {
  uuid: string
  date: string // YYYY-MM-DD
  steps: number
  updatedAt: number
  syncPending?: boolean
}

export interface WorkoutDraftRow {
  id: 1
  draftJson: string
  restTimerEndAt: number | null
  updatedAt: number
}

// View types (not stored, derived from joins)
export interface FoodLogWithFood extends FoodLog {
  food: Food
}

export interface WorkoutSetWithExercise extends WorkoutSet {
  exercise: Exercise
}

export interface WorkoutWithSets extends Workout {
  sets: WorkoutSetWithExercise[]
}

export interface DailyNutrition {
  kcal: number
  protein: number
  carbs: number
  fat: number
}
