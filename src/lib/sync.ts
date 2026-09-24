import type { Table } from 'dexie'
import { db } from '@/db'
import { supabase, isSupabaseConfigured } from './supabase'
import { useSyncStatus } from './syncStatus'

/**
 * Offline-first sync with Supabase.
 *
 * - Dexie is the source of truth on-device. Every write stamps `updatedAt`
 *   (client clock) and `syncPending: true`, then calls `requestSync()`.
 * - Push first: pending rows are upserted, pending deletions are sent as
 *   tombstones (`deleted = true`). The server trigger ignores writes older than
 *   what it already has (last-write-wins on `updatedAt`).
 * - Then pull: rows whose server-assigned `serverUpdatedAt` is past our cursor.
 *   Using the server clock for the cursor means edits made offline on another
 *   device and pushed later are still picked up.
 * - Local rows with unpushed newer edits are never overwritten by a pull.
 */

type SyncRow = { uuid: string; updatedAt: number; syncPending?: boolean }
type SingletonRow = { id: 1; updatedAt?: number; syncPending?: boolean }
type RemoteRow = Record<string, unknown> & { uuid: string; updatedAt?: number | null; serverUpdatedAt: number; deleted?: boolean }

interface CollectionSpec {
  remote: string
  table: () => Table<SyncRow, string>
  columns: readonly string[]
  shouldPush?: (row: SyncRow & Record<string, unknown>) => boolean
  normalize?: (row: Record<string, unknown>) => Record<string, unknown>
}

interface SingletonSpec {
  remote: string
  table: () => Table<SingletonRow, number>
  columns: readonly string[]
  defaults?: Record<string, unknown>
}

// Casts: each concrete Dexie table is a Table<SomeRow>, where SomeRow extends SyncRow.
const t = <T,>(table: T) => table as unknown as Table<SyncRow, string>
const s = <T,>(table: T) => table as unknown as Table<SingletonRow, number>

const COLLECTIONS: CollectionSpec[] = [
  {
    remote: 'foods',
    table: () => t(db.foods),
    columns: ['uuid', 'name', 'kcalPerServing', 'protein', 'carbs', 'fat', 'servingSize', 'servingUnit', 'isCustom', 'isFavorite', 'ingredients', 'notes', 'updatedAt'],
  },
  {
    remote: 'food_log',
    table: () => t(db.foodLog),
    columns: ['uuid', 'date', 'foodId', 'servings', 'mealType', 'updatedAt'],
  },
  {
    remote: 'body_metrics',
    table: () => t(db.bodyMetrics),
    columns: ['uuid', 'date', 'weightKg', 'notes', 'updatedAt'],
  },
  {
    remote: 'daily_activity',
    table: () => t(db.dailyActivity),
    columns: ['uuid', 'date', 'steps', 'updatedAt'],
  },
  {
    remote: 'achievements',
    table: () => t(db.achievements),
    columns: ['uuid', 'key', 'unlockedAt', 'progress', 'updatedAt'],
  },
  {
    remote: 'exercises',
    table: () => t(db.exercises),
    columns: ['uuid', 'name', 'category', 'type', 'defaultUnit', 'isCustom', 'muscles', 'musclesSecondary', 'instructions', 'updatedAt'],
    shouldPush: row => row.isCustom === true, // built-ins are seeded on every device
  },
  {
    remote: 'workouts',
    table: () => t(db.workouts),
    columns: ['uuid', 'date', 'name', 'routineId', 'notes', 'durationMin', 'startedAt', 'createdAt', 'avgHeartRate', 'kcalEst', 'updatedAt'],
    normalize: row => ({ notes: '', durationMin: 0, ...row }),
  },
  {
    remote: 'workout_sets',
    table: () => t(db.workoutSets),
    columns: ['uuid', 'workoutId', 'exerciseId', 'setIndex', 'reps', 'weight', 'duration', 'distanceKm', 'rpe', 'updatedAt'],
  },
  {
    remote: 'routines',
    table: () => t(db.routines),
    columns: ['uuid', 'name', 'category', 'level', 'estDurationMin', 'notes', 'exercises', 'scheduleDays', 'updatedAt'],
    normalize: row => ({ ...row, exercises: row.exercises ?? [], scheduleDays: row.scheduleDays ?? [] }),
  },
  {
    remote: 'challenges',
    table: () => t(db.challenges),
    columns: ['uuid', 'title', 'metric', 'target', 'startDate', 'endDate', 'createdAt', 'updatedAt'],
  },
  {
    remote: 'checkins',
    table: () => t(db.checkins),
    columns: ['uuid', 'date', 'key', 'done', 'amount', 'updatedAt'],
  },
  {
    remote: 'saved_meals',
    table: () => t(db.savedMeals),
    columns: ['uuid', 'name', 'items', 'mealType', 'updatedAt'],
    normalize: row => ({ ...row, items: row.items ?? [] }),
  },
]

const SINGLETONS: SingletonSpec[] = [
  {
    remote: 'targets',
    table: () => s(db.targets),
    columns: ['id', 'dailyKcal', 'dailyProtein', 'dailyCarbs', 'dailyFat', 'updatedAt'],
  },
  {
    remote: 'user_stats',
    table: () => s(db.userStats),
    columns: ['id', 'xp', 'level', 'currentStreak', 'longestStreak', 'lastLogDate', 'streakFreezes', 'freezeWeek', 'updatedAt'],
    defaults: { xp: 0, level: 1, currentStreak: 0, longestStreak: 0, lastLogDate: null, streakFreezes: 0 },
  },
  {
    remote: 'settings',
    table: () => s(db.settings),
    columns: [
      'id', 'displayName', 'heightCm', 'sex', 'goalType', 'dynamicTargetsEnabled', 'activityWindowDays',
      'dailyStepGoal', 'weeklyWorkoutGoal', 'defaultRestSeconds', 'reminderEnabled', 'reminderTime', 'reminderDays',
      'creatineEnabled', 'homeWidgets', 'waterGoalMl', 'waterGlassMl', 'trainingLevel', 'radarMuscles', 'shareOnLeaderboard', 'updatedAt',
    ],
  },
]

const PUSH_CHUNK = 500
const PULL_PAGE = 1000
// Re-read a small window before the cursor so rows committed slightly out of
// order on the server aren't skipped. Re-applying a row is harmless.
const CURSOR_OVERLAP_MS = 5 * 60_000
// fetch failures as reported by Chrome, Firefox and Safari, plus our request timeout.
const NETWORK_ERROR = /failed to fetch|networkerror|load failed|timeouterror|aborterror|timed out|network request failed/i

// Untyped view of the client for dynamic table names.
type Query = PromiseLike<{ data: unknown; error: { message: string } | null }> & Record<string, (...args: unknown[]) => Query>
const sb = supabase as unknown as { from: (table: string) => Record<string, (...args: unknown[]) => Query> }

function cursorKey(userId: string, remote: string) {
  return `solo:sync:${userId}:${remote}`
}

function toRemote(row: Record<string, unknown>, columns: readonly string[], userId: string) {
  const out: Record<string, unknown> = { user_id: userId }
  for (const c of columns) out[c] = row[c] ?? null
  return out
}

function fromRemote(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    if (k === 'user_id' || k === 'serverUpdatedAt' || k === 'deleted') continue
    if (v === null) continue // Dexie rows use undefined for "absent"
    out[k] = v
  }
  return out
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

class SyncService {
  private userId: string | null = null
  private running: Promise<void> | null = null
  private again = false

  /** Called by the auth layer when the signed-in user changes. */
  setUser(userId: string | null): void {
    this.userId = userId
  }

  /** Fire-and-forget sync for the current user (no-op when signed out / offline). */
  request(): void {
    if (this.userId) void this.sync(this.userId)
  }

  /** Resolves once any in-flight sync has finished. */
  async whenIdle(): Promise<void> {
    while (this.running) await this.running
  }

  sync(userId: string): Promise<void> {
    if (!isSupabaseConfigured || !navigator.onLine) return Promise.resolve()
    if (this.running) {
      this.again = true // a write landed mid-sync: run once more afterwards
      return this.running
    }
    this.running = (async () => {
      const status = useSyncStatus.getState()
      status.set({ state: 'syncing' })
      try {
        let errors: string[] = []
        do {
          this.again = false
          errors = await this.runOnce(userId)
        } while (this.again && this.userId === userId)
        if (errors.length > 0) {
          console.error('[sync] finished with errors:', errors)
          status.set({ state: 'error', error: errors[0] })
        } else {
          status.set({ state: 'idle', error: null, lastSyncedAt: Date.now() })
        }
      } catch (err) {
        console.error('[sync] failed:', err)
        status.set({ state: 'error', error: err instanceof Error ? err.message : String(err) })
      } finally {
        this.running = null
      }
    })()
    return this.running
  }

  /** Number of local changes not yet on the server (used to warn before sign-out). */
  async pendingCount(): Promise<number> {
    let n = await db.pendingDeletes.count()
    for (const spec of COLLECTIONS) {
      n += await spec.table().filter(r => !!r.syncPending).count()
    }
    for (const spec of SINGLETONS) {
      if ((await spec.table().get(1))?.syncPending) n += 1
    }
    return n
  }

  private async runOnce(userId: string): Promise<string[]> {
    const errors: string[] = []
    // Once the server is unreachable, skip the remaining tables instead of waiting
    // for each request to time out; the next trigger (reconnect, foreground, a write) retries.
    let unreachable = false
    const guard = async (label: string, fn: () => Promise<void>) => {
      if (unreachable) return
      try {
        await fn()
      } catch (err) {
        const msg = err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err ? String((err as { message: unknown }).message) : String(err)
        errors.push(`${label}: ${msg}`)
        if (NETWORK_ERROR.test(msg)) unreachable = true
      }
    }

    // Push
    for (const spec of COLLECTIONS) await guard(`push ${spec.remote}`, () => this.pushCollection(spec, userId))
    for (const spec of SINGLETONS) await guard(`push ${spec.remote}`, () => this.pushSingleton(spec, userId))
    await guard('push deletions', () => this.pushDeletions(userId))

    // Pull (skip if the user signed out meanwhile)
    if (this.userId !== userId) return errors
    for (const spec of COLLECTIONS) await guard(`pull ${spec.remote}`, () => this.pullCollection(spec, userId))
    for (const spec of SINGLETONS) await guard(`pull ${spec.remote}`, () => this.pullSingleton(spec, userId))
    return errors
  }

  private async pushCollection(spec: CollectionSpec, userId: string): Promise<void> {
    const table = spec.table()
    const pending = await table
      .filter(r => !!r.syncPending && (spec.shouldPush?.(r as SyncRow & Record<string, unknown>) ?? true))
      .toArray()
    if (pending.length === 0) return

    for (const part of chunk(pending, PUSH_CHUNK)) {
      const records = part.map(r => toRemote(r as Record<string, unknown>, spec.columns, userId))
      const { error } = await sb.from(spec.remote).upsert(records, { onConflict: 'user_id,uuid' })
      if (error) throw error

      // Clear the flag only on rows that weren't edited again while we pushed.
      await db.transaction('rw', table, async () => {
        const current = await table.bulkGet(part.map(r => r.uuid))
        const done = current.filter((c, i): c is SyncRow => !!c && c.syncPending === true && c.updatedAt === part[i].updatedAt)
        if (done.length > 0) await table.bulkPut(done.map(c => ({ ...c, syncPending: false })))
      })
    }
  }

  private async pushSingleton(spec: SingletonSpec, userId: string): Promise<void> {
    const table = spec.table()
    const local = await table.get(1)
    if (!local?.syncPending) return

    const record = toRemote(local as Record<string, unknown>, spec.columns, userId)
    const { error } = await sb.from(spec.remote).upsert(record, { onConflict: 'user_id' })
    if (error) throw error

    await db.transaction('rw', table, async () => {
      const current = await table.get(1)
      if (current?.syncPending && current.updatedAt === local.updatedAt) {
        await table.put({ ...current, syncPending: false })
      }
    })
  }

  private async pushDeletions(userId: string): Promise<void> {
    const pending = await db.pendingDeletes.toArray()
    if (pending.length === 0) return

    const byTable = new Map<string, typeof pending>()
    for (const p of pending) byTable.set(p.table, [...(byTable.get(p.table) ?? []), p])

    for (const [remote, rows] of byTable) {
      for (const part of chunk(rows, 200)) {
        const deletedAt = Math.max(...part.map(p => p.deletedAt))
        const { error } = await sb
          .from(remote)
          .update({ deleted: true, updatedAt: deletedAt })
          .eq('user_id', userId)
          .in('uuid', part.map(p => p.uuid))
        if (error) throw error
        await db.pendingDeletes.bulkDelete(part.map(p => p.key))
      }
    }
  }

  private async pullCollection(spec: CollectionSpec, userId: string): Promise<void> {
    const key = cursorKey(userId, spec.remote)
    const cursor = Number(localStorage.getItem(key) ?? '0')
    const since = Math.max(0, cursor - CURSOR_OVERLAP_MS)
    let maxSeen = cursor
    let last: { ts: number; uuid: string } | null = null

    for (;;) {
      let q = sb
        .from(spec.remote)
        .select('*')
        .eq('user_id', userId)
        .order('serverUpdatedAt', { ascending: true })
        .order('uuid', { ascending: true })
        .limit(PULL_PAGE)
      q = last
        ? q.or(`serverUpdatedAt.gt.${last.ts},and(serverUpdatedAt.eq.${last.ts},uuid.gt."${last.uuid}")`)
        : q.gte('serverUpdatedAt', since)

      // No client-side retries: sync already retries on reconnect/foreground/next write,
      // and library retries (x3 with backoff) made a dead connection take minutes to report.
      const { data, error } = await q.retry(false)
      if (error) throw error
      const rows = (data ?? []) as RemoteRow[]
      if (rows.length === 0) break

      if (this.userId !== userId) return // signed out mid-pull: don't write into a wiped DB
      await this.applyRemoteRows(spec, rows)

      const tail = rows[rows.length - 1]
      last = { ts: Number(tail.serverUpdatedAt), uuid: tail.uuid }
      maxSeen = Math.max(maxSeen, last.ts)
      if (rows.length < PULL_PAGE) break
    }

    localStorage.setItem(key, String(maxSeen))
  }

  private async applyRemoteRows(spec: CollectionSpec, rows: RemoteRow[]): Promise<void> {
    const table = spec.table()
    await db.transaction('rw', table, db.pendingDeletes, async () => {
      const uuids = rows.map(r => r.uuid)
      const [locals, tombstones] = await Promise.all([
        table.bulkGet(uuids),
        db.pendingDeletes.bulkGet(uuids.map(u => `${spec.remote}:${u}`)),
      ])
      const puts: SyncRow[] = []
      const dels: string[] = []

      rows.forEach((remote, i) => {
        const local = locals[i]
        const remoteUpdated = Number(remote.updatedAt ?? 0)
        if (tombstones[i]) return // deleted here; our tombstone wins or loses on the server
        if (local?.syncPending && local.updatedAt > remoteUpdated) return // local edit is newer
        if (remote.deleted) {
          if (local) dels.push(remote.uuid)
          return
        }
        if (local && !local.syncPending && local.updatedAt === remoteUpdated) return // unchanged
        const row = fromRemote(remote)
        puts.push({ ...(spec.normalize ? spec.normalize(row) : row), syncPending: false } as SyncRow)
      })

      if (puts.length > 0) await table.bulkPut(puts)
      if (dels.length > 0) await table.bulkDelete(dels)
    })
  }

  private async pullSingleton(spec: SingletonSpec, userId: string): Promise<void> {
    const { data, error } = await sb.from(spec.remote).select('*').eq('user_id', userId).maybeSingle().retry(false)
    if (error) throw error
    if (!data) return

    const remote = data as Record<string, unknown> & { updatedAt?: number | null }
    const table = spec.table()
    await db.transaction('rw', table, async () => {
      const local = await table.get(1)
      const remoteUpdated = Number(remote.updatedAt ?? 0)
      const localUpdated = local?.updatedAt ?? 0
      // Seeded defaults have updatedAt 0, so a fresh device always adopts the server copy.
      if (local && remoteUpdated <= localUpdated) return
      // Replace (not merge) so a field cleared on another device is cleared here too.
      await table.put({ ...spec.defaults, ...fromRemote(remote), id: 1, syncPending: false } as SingletonRow)
    })
  }
}

export const syncService = new SyncService()

/** Queue a background sync after a local write. */
export function requestSync(): void {
  syncService.request()
}

/**
 * Delete rows locally and remember them so the deletion reaches the server
 * (and from there, the user's other devices).
 */
export async function deleteSynced<T extends { uuid: string }>(
  table: Table<T, string>,
  remote: string,
  uuids: string[],
): Promise<void> {
  if (uuids.length === 0) return
  const now = Date.now()
  await db.transaction('rw', table, db.pendingDeletes, async () => {
    await table.bulkDelete(uuids)
    await db.pendingDeletes.bulkPut(
      uuids.map(uuid => ({ key: `${remote}:${uuid}`, table: remote, uuid, deletedAt: now })),
    )
  })
  requestSync()
}

/** Forget this device's sync cursors for a user (used when wiping local data). */
export function clearSyncCursors(userId: string): void {
  for (const spec of COLLECTIONS) localStorage.removeItem(cursorKey(userId, spec.remote))
  localStorage.removeItem('soloLeveling_lastSyncedAt') // legacy key
}
