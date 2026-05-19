import { createClient } from '@supabase/supabase-js'
import type {
  Exercise, Workout, WorkoutSet, Food, FoodLog,
  BodyMetric, Targets, Achievement, PrRecord,
} from '@/types'

// Supabase row types mirror Dexie types but include user_id
type WithUserId<T> = T & { user_id: string }

export type SupabaseExercise   = WithUserId<Exercise>
export type SupabaseWorkout    = WithUserId<Workout>
export type SupabaseWorkoutSet = WithUserId<WorkoutSet>
export type SupabaseFood       = WithUserId<Food>
export type SupabaseFoodLog    = WithUserId<FoodLog>
export type SupabaseBodyMetric = WithUserId<BodyMetric>
export type SupabaseTargets    = WithUserId<Targets> & { user_id: string }
export type SupabaseAchievement = WithUserId<Achievement>
export type SupabasePrRecord   = WithUserId<PrRecord>

export interface Database {
  public: {
    Tables: {
      exercises:    { Row: SupabaseExercise;    Insert: SupabaseExercise;    Update: Partial<SupabaseExercise> }
      workouts:     { Row: SupabaseWorkout;     Insert: SupabaseWorkout;     Update: Partial<SupabaseWorkout> }
      workout_sets: { Row: SupabaseWorkoutSet;  Insert: SupabaseWorkoutSet;  Update: Partial<SupabaseWorkoutSet> }
      foods:        { Row: SupabaseFood;        Insert: SupabaseFood;        Update: Partial<SupabaseFood> }
      food_log:     { Row: SupabaseFoodLog;     Insert: SupabaseFoodLog;     Update: Partial<SupabaseFoodLog> }
      body_metrics: { Row: SupabaseBodyMetric;  Insert: SupabaseBodyMetric;  Update: Partial<SupabaseBodyMetric> }
      targets:      { Row: SupabaseTargets;     Insert: SupabaseTargets;     Update: Partial<SupabaseTargets> }
      achievements: { Row: SupabaseAchievement; Insert: SupabaseAchievement; Update: Partial<SupabaseAchievement> }
      pr_records:   { Row: SupabasePrRecord;    Insert: SupabasePrRecord;    Update: Partial<SupabasePrRecord> }
    }
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

// Fallback placeholder values prevent createClient from throwing at module load time
export const supabase = createClient<Database>(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseKey ?? 'placeholder-key',
)
