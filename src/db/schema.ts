import Dexie, { type Table } from 'dexie'
import type {
  Food, FoodLog,
  BodyMetric, UserStats, Targets, Achievement, Settings, DailyActivity,
  Exercise, Workout, WorkoutSet, WorkoutDraftRow, Routine, Challenge, PendingDelete, Checkin, SavedMeal,
} from '@/types'

export class SoloLevelingDB extends Dexie {
  foods!:          Table<Food,            string>
  foodLog!:        Table<FoodLog,         string>
  bodyMetrics!:    Table<BodyMetric,      string>
  dailyActivity!:  Table<DailyActivity,   string>
  userStats!:      Table<UserStats,       number>
  targets!:        Table<Targets,         number>
  achievements!:   Table<Achievement,     string>
  settings!:       Table<Settings,        number>
  exercises!:      Table<Exercise,        string>
  workouts!:       Table<Workout,         string>
  workoutSets!:    Table<WorkoutSet,      string>
  workoutDrafts!:  Table<WorkoutDraftRow, number>
  routines!:       Table<Routine,         string>
  challenges!:     Table<Challenge,       string>
  pendingDeletes!: Table<PendingDelete,   string>
  checkins!:       Table<Checkin,         string>
  savedMeals!:     Table<SavedMeal,       string>

  constructor() {
    super('SoloLevelingDB')
    this.version(1).stores({
      exercises:    'uuid, name, category, type, isCustom, syncPending',
      workouts:     'uuid, date, createdAt, syncPending',
      workoutSets:  'uuid, workoutId, exerciseId, syncPending',
      foods:        'uuid, name, isCustom, isFavorite, syncPending',
      foodLog:      'uuid, date, foodId, mealType, syncPending',
      bodyMetrics:  'uuid, date, syncPending',
      userStats:    'id',
      targets:      'id',
      achievements: 'uuid, key, syncPending',
      prRecords:    'uuid, exerciseId, metric, syncPending',
      settings:     'id',
    })
    this.version(2).stores({
      achievements: 'uuid, key, unlockedAt, syncPending',
    })
    this.version(3).stores({}) // Settings gains optional profile fields (no index changes)
    this.version(4).stores({}) // Food gains optional ingredients[] field (no index changes)
    this.version(5).stores({}) // Food gains optional notes field + UserStats gains updatedAt/syncPending (no index changes)
    this.version(6).stores({
      dailyActivity: 'uuid, date, syncPending',
    })
    this.version(7).stores({
      workoutDrafts: 'id',
    })
    this.version(8).stores({}) // Settings gains updatedAt/syncPending (no index changes)
    this.version(9).stores({
      exercises: null, workouts: null, workoutSets: null,
      prRecords: null, workoutDrafts: null,
    }) // remove workout feature — drop its tables
    this.version(10).stores({
      exercises:      'uuid, name, category, type, isCustom',
      workouts:       'uuid, date, createdAt, routineId',
      workoutSets:    'uuid, workoutId, exerciseId',
      workoutDrafts:  'id',
      routines:       'uuid, name',
      challenges:     'uuid, endDate',
      pendingDeletes: 'key, table',
    }) // workouts return (routines, plan, challenges) + sync tombstones
    this.version(11).stores({
      checkins: 'uuid, date, key',
    }) // daily check-ins (creatine); Settings gains creatineEnabled
    this.version(12).stores({}) // Checkin gains amount (water); Settings gains homeWidgets, waterGoalMl, waterGlassMl (no index changes)
    this.version(13).stores({}) // Settings gains trainingLevel, radarMuscles (volume radar; no index changes)
    this.version(14).stores({}) // Settings gains shareOnLeaderboard (no index changes)
    this.version(15).stores({
      savedMeals: 'uuid, name',
    }) // saved meals (one-tap food logging)
  }
}
