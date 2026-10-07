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

/** A named set of foods logged together in one tap ("My usual breakfast"). */
export interface SavedMeal {
  uuid: string
  name: string
  items: { foodId: string; servings: number }[]
  mealType?: MealType // the meal it was saved from; listed first there
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

/** What the app can remind you about (Settings → Reminders). */
export type ReminderKind = 'workout' | 'creatine' | 'food' | 'weight' | 'water' | 'recap'

export interface ReminderPref {
  on: boolean
  time: string // HH:mm, local
  /** Workout only: every day, or only the days with a scheduled routine. */
  days?: ReminderDays
}

export type HomeWidgetId = 'workout' | 'steps' | 'calories' | 'water' | 'creatine' | 'macros' | 'challenge' | 'rank' | 'leaderboard' | 'streak'

/** Pages that can sit in the two customizable bottom-bar slots (Home and Settings are fixed). */
export type NavTabId = 'workouts' | 'nutrition' | 'analytics' | 'strength' | 'leaderboard' | 'profile'

/** What a long-press on the Android app's icon can offer (features/settings/appShortcuts.ts). */
export type AppShortcutId = 'workout' | 'food' | 'weight' | 'water' | 'steps' | 'recap' | 'ranks' | 'leaderboard' | 'analytics'

/** A palette the user mixed themselves: three "H S% L%" colours, the rest is derived (features/settings/themeBuilder.ts). */
export interface CustomTheme {
  mode: 'dark' | 'light'
  accent: string
  background: string
  /** The far end of the accent gradient (unset = follows the accent). */
  gradient?: string
}

export type TrainingLevel = 'beginner' | 'intermediate' | 'advanced'
export type VolumeMuscle =
  | 'chest' | 'shoulders' | 'triceps' | 'biceps' | 'forearms' | 'abs'
  | 'quads' | 'adductors' | 'abductors' | 'glutes' | 'hamstrings' | 'calves'
  | 'lower-back' | 'traps' | 'lats'

export interface Settings {
  id: 1
  displayName?: string
  heightCm?: number
  sex?: 'male' | 'female'
  goalType?: 'cut' | 'maintain' | 'bulk'
  dynamicTargetsEnabled?: boolean // subtract step calories from what was eaten (unset = on; `countsSteps`)
  activityWindowDays?: number // legacy (rolling-average activity targets), unused
  dailyStepGoal?: number
  weeklyWorkoutGoal?: number
  defaultRestSeconds?: number
  reminderEnabled?: boolean // legacy workout reminder (before `reminders`); read through `reminderPrefs`
  reminderTime?: string // HH:mm
  reminderDays?: ReminderDays
  reminders?: Partial<Record<ReminderKind, ReminderPref>> // what to be reminded of, and when
  creatineEnabled?: boolean // legacy (before homeWidgets): false hid the creatine card
  homeWidgets?: HomeWidgetId[] // Home cards in display order (unset = all, default order)
  waterGoalMl?: number
  waterGlassMl?: number
  trainingLevel?: TrainingLevel // weekly set-volume targets (unset = intermediate)
  radarMuscles?: VolumeMuscle[] // muscles on the volume radar (unset = default twelve)
  shareOnLeaderboard?: boolean // friends leaderboard (unset = shared)
  theme?: string // colour palette id (features/settings/themes.ts; unset = the default dark theme)
  navTabs?: NavTabId[] // the two bottom-bar slots beside + (unset = workouts, analytics)
  avatar?: string // profile photo: a small JPEG data URL (≈10 KB), shared on the leaderboard
  showSearch?: boolean // search bar on Home (unset = shown)
  workoutTips?: boolean // "what to try today" on each lift in the logger (unset = shown)
  appShortcuts?: AppShortcutId[] // long-press actions on the Android app's icon, in order (unset = workout, food, weight)
  customTheme?: CustomTheme // the user's own palette, on screen when theme = 'custom'
  achievementGoals?: string[] // achievement keys picked as goals (features/gamification/goals.ts)
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

/**
 * The user's own note on an exercise (machine settings, grip, cues). One row per
 * exercise (id `note-<exerciseId>`), kept apart from `exercises` because built-ins
 * are re-seeded on every start and never synced. Clearing a note saves text = ''.
 */
export interface ExerciseNote {
  uuid: string
  exerciseId: string
  text: string
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
