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
  freezeWeek?: string // ISO week the last streak freeze was granted, e.g. "2026-W38"
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

export type ReminderDays = 'daily' | 'workout-days'

export type HomeWidgetId = 'workout' | 'steps' | 'calories' | 'water' | 'creatine' | 'macros' | 'challenge' | 'rank' | 'streak'

export interface Settings {
  id: 1
  displayName?: string
  heightCm?: number
  sex?: 'male' | 'female'
  goalType?: 'cut' | 'maintain' | 'bulk'
  dynamicTargetsEnabled?: boolean
  activityWindowDays?: number // 3-7
  dailyStepGoal?: number
  weeklyWorkoutGoal?: number
  defaultRestSeconds?: number
  reminderEnabled?: boolean
  reminderTime?: string // HH:mm
  reminderDays?: ReminderDays
  creatineEnabled?: boolean // legacy (before homeWidgets): false hid the creatine card
  homeWidgets?: HomeWidgetId[] // Home cards in display order (unset = all, default order)
  waterGoalMl?: number
  waterGlassMl?: number
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

// ── Workouts ──────────────────────────────────────────────────────────────────

export type ExerciseType = 'strength' | 'cardio' | 'bodyweight' | 'flexibility'

export interface Exercise {
  uuid: string
  name: string
  category: string
  type: ExerciseType
  defaultUnit: 'kg' | 'lb' | 'min' | 'reps' | 'km'
  isCustom: boolean
  muscles?: string[]
  musclesSecondary?: string[]
  instructions?: string
  updatedAt: number
  syncPending?: boolean
}

export type RoutineCategory = 'strength' | 'cardio' | 'core' | 'mobility' | 'full-body'
export type RoutineLevel = 'beginner' | 'intermediate' | 'advanced'

export interface RoutineExercise {
  exerciseId: string
  sets: number
  reps: number // target reps (or minutes for cardio)
  restSec: number
}

export interface Routine {
  uuid: string
  name: string
  category: RoutineCategory
  level: RoutineLevel
  estDurationMin?: number
  notes?: string
  exercises: RoutineExercise[]
  scheduleDays: number[] // 0 = Sunday … 6 = Saturday
  updatedAt: number
  syncPending?: boolean
}

export interface Workout {
  uuid: string
  date: string // YYYY-MM-DD
  name?: string
  routineId?: string
  notes: string
  durationMin: number
  startedAt?: number
  createdAt: number
  avgHeartRate?: number
  kcalEst?: number
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
  duration?: number // minutes
  distanceKm?: number
  rpe?: number
  updatedAt: number
  syncPending?: boolean
}

/** Local-only: the in-progress workout, persisted so a reload doesn't lose it. */
export interface WorkoutDraftRow {
  id: 1
  draftJson: string
  restTimerEndAt: number | null
  updatedAt: number
}

// ── Challenges (personal) ─────────────────────────────────────────────────────

export type ChallengeMetric = 'workouts' | 'steps' | 'volume' | 'food-days' | 'protein-days'

export interface Challenge {
  uuid: string
  title: string
  metric: ChallengeMetric
  target: number
  startDate: string // YYYY-MM-DD, inclusive
  endDate: string // YYYY-MM-DD, inclusive
  createdAt: number
  updatedAt: number
  syncPending?: boolean
}

// ── Daily check-ins ───────────────────────────────────────────────────────────

export type CheckinKey = 'creatine' | 'water'

/**
 * One row per habit per day (id `creatine-YYYY-MM-DD`, `water-YYYY-MM-DD`).
 * Unticking sets done = false; water keeps a running `amount` in ml.
 */
export interface Checkin {
  uuid: string
  date: string // YYYY-MM-DD
  key: CheckinKey
  done: boolean
  amount?: number
  updatedAt: number
  syncPending?: boolean
}

// ── Sync bookkeeping (local-only) ─────────────────────────────────────────────

/** A row deleted on this device that still has to be tombstoned on the server. */
export interface PendingDelete {
  key: string // `${remoteTable}:${uuid}`
  table: string // remote (Supabase) table name
  uuid: string
  deletedAt: number
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
