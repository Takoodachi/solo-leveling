import Dexie, { type Table } from 'dexie'
import type {
  Exercise, Workout, WorkoutSet, Food, FoodLog,
  BodyMetric, UserStats, Targets, Achievement, PrRecord, Settings, DailyActivity,
  WorkoutDraftRow,
} from '@/types'

export class SoloLevelingDB extends Dexie {
  exercises!:     Table<Exercise,        string>
  workouts!:      Table<Workout,         string>
  workoutSets!:   Table<WorkoutSet,      string>
  foods!:         Table<Food,            string>
  foodLog!:       Table<FoodLog,         string>
  bodyMetrics!:   Table<BodyMetric,      string>
  dailyActivity!: Table<DailyActivity,   string>
  userStats!:     Table<UserStats,       number>
  targets!:       Table<Targets,         number>
  achievements!:  Table<Achievement,     string>
  prRecords!:     Table<PrRecord,        string>
  settings!:      Table<Settings,        number>
  workoutDrafts!: Table<WorkoutDraftRow, number>

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
  }
}
