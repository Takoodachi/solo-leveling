import { db } from '@/db'
import { supabase, isSupabaseConfigured } from './supabase'
import type {
  Exercise, Workout, WorkoutSet, Food, FoodLog,
  BodyMetric, Targets, Achievement, PrRecord, UserStats, DailyActivity,
} from '@/types'

const LAST_SYNCED_KEY = 'soloLeveling_lastSyncedAt'

function getLastSyncedAt(): number {
  return Number(localStorage.getItem(LAST_SYNCED_KEY) ?? '0')
}

function setLastSyncedAt(ts: number): void {
  localStorage.setItem(LAST_SYNCED_KEY, String(ts))
}

// Use permissive Supabase client for generic table operations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as unknown as { from: (table: string) => any }

function toSupabase<T extends { syncPending?: boolean }>(row: T, userId: string) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { syncPending: _sp, ...rest } = row
  return { ...rest, user_id: userId }
}

function fromSupabase<T extends object>(row: T & { user_id?: string }): Omit<T, 'user_id'> & { syncPending: boolean } {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user_id: _uid, ...rest } = row
  return { ...(rest as Omit<T, 'user_id'>), syncPending: false }
}

class SyncService {
  private syncing = false

  async sync(userId: string): Promise<void> {
    if (this.syncing || !navigator.onLine || !isSupabaseConfigured) return
    this.syncing = true
    try {
      const lastSyncedAt = getLastSyncedAt()
      await this.pull(userId, lastSyncedAt)
      await this.push(userId)
      setLastSyncedAt(Date.now())
    } catch (err) {
      console.error('[SyncService] sync failed:', err)
    } finally {
      this.syncing = false
    }
  }

  private async push(userId: string): Promise<void> {
    await Promise.all([
      this.pushTable<Exercise>('exercises', userId,
        () => db.exercises.filter(r => r.isCustom && !!r.syncPending).toArray(),
        (rows) => db.exercises.bulkPut(rows),
      ),
      this.pushTable<Workout>('workouts', userId,
        () => db.workouts.filter(r => !!r.syncPending).toArray(),
        (rows) => db.workouts.bulkPut(rows),
      ),
      this.pushTable<WorkoutSet>('workout_sets', userId,
        () => db.workoutSets.filter(r => !!r.syncPending).toArray(),
        (rows) => db.workoutSets.bulkPut(rows),
      ),
      this.pushTable<Food>('foods', userId,
        () => db.foods.filter(r => r.isCustom && !!r.syncPending).toArray(),
        (rows) => db.foods.bulkPut(rows),
      ),
      this.pushTable<FoodLog>('food_log', userId,
        () => db.foodLog.filter(r => !!r.syncPending).toArray(),
        (rows) => db.foodLog.bulkPut(rows),
      ),
      this.pushTable<BodyMetric>('body_metrics', userId,
        () => db.bodyMetrics.filter(r => !!r.syncPending).toArray(),
        (rows) => db.bodyMetrics.bulkPut(rows),
      ),
      this.pushTable<DailyActivity>('daily_activity', userId,
        () => db.dailyActivity.filter(r => !!r.syncPending).toArray(),
        (rows) => db.dailyActivity.bulkPut(rows),
      ),
      this.pushTable<Achievement>('achievements', userId,
        () => db.achievements.filter(r => !!r.syncPending).toArray(),
        (rows) => db.achievements.bulkPut(rows),
      ),
      this.pushTable<PrRecord>('pr_records', userId,
        () => db.prRecords.filter(r => !!r.syncPending).toArray(),
        (rows) => db.prRecords.bulkPut(rows),
      ),
      this.pushTargets(userId),
      this.pushUserStats(userId),
    ])
  }

  private async pushTable<T extends { uuid: string; syncPending?: boolean; updatedAt: number }>(
    tableName: string,
    userId: string,
    getPending: () => Promise<T[]>,
    saveCleaned: (rows: T[]) => Promise<unknown>,
  ): Promise<void> {
    const pending = await getPending()
    if (pending.length === 0) return

    const records = pending.map(r => toSupabase(r, userId))
    const { error } = await sb.from(tableName).upsert(records, { onConflict: 'uuid' })
    if (error) {
      console.error(`[SyncService] push ${tableName} failed:`, error.message)
      return
    }
    await saveCleaned(pending.map(r => ({ ...r, syncPending: false })))
  }

  private async pushTargets(userId: string): Promise<void> {
    const targets = await db.targets.get(1)
    if (!targets?.syncPending) return
    const { syncPending: _sp, ...rest } = targets
    const { error } = await sb
      .from('targets')
      .upsert({ ...rest, user_id: userId }, { onConflict: 'user_id' })
    if (!error) {
      await db.targets.put({ ...targets, syncPending: false })
    }
  }

  private async pull(userId: string, lastSyncedAt: number): Promise<void> {
    await Promise.all([
      this.pullTable<Exercise>('exercises', userId, lastSyncedAt,
        (rows) => db.exercises.bulkPut(rows),
      ),
      this.pullTable<Workout>('workouts', userId, lastSyncedAt,
        (rows) => db.workouts.bulkPut(rows),
      ),
      this.pullTable<WorkoutSet>('workout_sets', userId, lastSyncedAt,
        (rows) => db.workoutSets.bulkPut(rows),
      ),
      this.pullTable<Food>('foods', userId, lastSyncedAt,
        (rows) => db.foods.bulkPut(rows),
      ),
      this.pullTable<FoodLog>('food_log', userId, lastSyncedAt,
        (rows) => db.foodLog.bulkPut(rows),
      ),
      this.pullTable<BodyMetric>('body_metrics', userId, lastSyncedAt,
        (rows) => db.bodyMetrics.bulkPut(rows),
      ),
      this.pullTable<DailyActivity>('daily_activity', userId, lastSyncedAt,
        (rows) => db.dailyActivity.bulkPut(rows),
      ),
      this.pullTable<Achievement>('achievements', userId, lastSyncedAt,
        (rows) => db.achievements.bulkPut(rows),
      ),
      this.pullTable<PrRecord>('pr_records', userId, lastSyncedAt,
        (rows) => db.prRecords.bulkPut(rows),
      ),
      this.pullTargets(userId),
      this.pullUserStats(userId),
    ])
  }

  private async pullTable<T extends object>(
    tableName: string,
    userId: string,
    lastSyncedAt: number,
    save: (rows: Array<Omit<T, 'user_id'> & { syncPending: boolean }>) => Promise<unknown>,
  ): Promise<void> {
    const { data, error } = await sb
      .from(tableName)
      .select('*')
      .eq('user_id', userId)
      .gt('updatedAt', lastSyncedAt)

    if (error) {
      console.error(`[SyncService] pull ${tableName} failed:`, error.message)
      return
    }
    if (!data || data.length === 0) return

    const rows = (data as Array<T & { user_id?: string }>).map(r => fromSupabase(r))
    await save(rows)
  }

  private async pullTargets(userId: string): Promise<void> {
    const { data, error } = await sb
      .from('targets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error || !data) return

    const local = await db.targets.get(1)
    const remote = data as Targets & { user_id: string }
    if (!local || remote.updatedAt > local.updatedAt) {
      const { user_id: _uid, ...rest } = remote
      await db.targets.put({ ...rest, id: 1, syncPending: false })
    }
  }

  private async pushUserStats(userId: string): Promise<void> {
    const stats = await db.userStats.get(1)
    if (!stats?.syncPending) return
    const { syncPending: _sp, ...rest } = stats
    const { error } = await sb
      .from('user_stats')
      .upsert({ ...rest, user_id: userId }, { onConflict: 'user_id' })
    if (!error) {
      await db.userStats.put({ ...stats, syncPending: false })
    }
  }

  private async pullUserStats(userId: string): Promise<void> {
    const { data, error } = await sb
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error || !data) return

    const local = await db.userStats.get(1)
    const remote = data as UserStats & { user_id: string; updatedAt: number }
    if (!local || (remote.updatedAt ?? 0) > (local.updatedAt ?? 0)) {
      const { user_id: _uid, ...rest } = remote
      await db.userStats.put({ ...rest, id: 1, syncPending: false })
    }
  }
}

export const syncService = new SyncService()
