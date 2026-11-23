import type { Table } from 'dexie'
import { db } from '@/db'
import { writesTo } from '@/db/read'
import { forgetCatalog } from '@/db/seed'
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
    columns: ['uuid', 'name', 'kcalPerServing', 'protein', 'carbs', 'fat', 'servingSize', 'servingUnit', 'isCustom', 'isFavorite', 'ingredients', 'notes', 'removed', 'updatedAt'],
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
    columns: ['uuid', 'workoutId', 'exerciseId', 'setIndex', 'reps', 'weight', 'duration', 'distanceKm', 'rpe', 'kind', 'updatedAt'],
  },
  {
    remote: 'routines',
    table: () => t(db.routines),
    columns: ['uuid', 'name', 'category', 'level', 'estDurationMin', 'notes', 'exercises', 'scheduleDays', 'image', 'updatedAt'],
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
  {
    remote: 'exercise_notes',
    table: () => t(db.exerciseNotes),
    columns: ['uuid', 'exerciseId', 'text', 'unit', 'updatedAt'],
    normalize: row => ({ text: '', ...row }),
  },
  {
    // The photo behind the app and how it's shown, one pair per kind of screen (features/settings/wallpaper.ts)
    remote: 'wallpapers',
    table: () => t(db.wallpapers),
    columns: ['uuid', 'dataUrl', 'dim', 'blur', 'updatedAt'],
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
      'dailyStepGoal', 'weeklyWorkoutGoal', 'defaultRestSeconds', 'reminderEnabled', 'reminderTime', 'reminderDays', 'reminders',
      'creatineEnabled', 'homeWidgets', 'waterGoalMl', 'waterGlassMl', 'trainingLevel', 'radarMuscles', 'shareOnLeaderboard', 'shareRoutines', 'theme', 'navTabs', 'avatar', 'showSearch',
      'workoutTips', 'appShortcuts', 'customTheme', 'achievementGoals', 'trainingSince', 'cardStyle', 'health', 'goalPace', 'goalWeightKg', 'trainingDayCarbs', 'extras', 'weightUnit', 'heightUnit', 'updatedAt',
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

/**
 * Sends rows in one request. One value the server can't take (a decimal in a whole-number column)
 * refuses the whole request, so then they go one at a time: the rest arrive and only that row
 * stays waiting. Returns the first refusal, if any.
 */
export async function sendEachOnRefusal<T>(rows: T[], send: (rows: T[]) => Promise<Error | null>): Promise<Error | null> {
  const error = await send(rows)
  if (!error || rows.length === 1 || NETWORK_ERROR.test(error.message)) return error
  let first: Error | null = null
  for (const row of rows) {
    const e = await send([row])
    if (e && NETWORK_ERROR.test(e.message)) return e
    first ??= e
  }
  return first
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
  // What `writesTo` said of each table when it last had nothing left to push. Unchanged, it
  // still has nothing, and isn't read: looking through every table on every sync took seconds.
  private clean = new Map<string, number>()

  /** Called by the auth layer when the signed-in user changes. */
  setUser(userId: string | null): void {
    this.userId = userId
    this.clean.clear()
  }

  /** Fire-and-forget sync for the current user (no-op when signed out / offline). */
  request(): void {
    if (this.userId) void this.sync(this.userId)
  }

  /**
   * The same, looking through every table again. For coming back to the app: while it was away,
   * something else may have written here (a reminder's log button and the background step sync
   * run in a page of their own), and this doesn't count on hearing of that.
   */
  requestAll(): void {
    this.clean.clear()
    this.request()
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
        let pulled: string[] | undefined // the pull's errors, once it has run
        do {
          this.again = false
          // One pull per run: a write that landed meanwhile only needs pushing
          const run = await this.runOnce(userId, !pulled)
          if (run.pulled) pulled = run.pull
          errors = [...run.push, ...(pulled ?? [])]
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
      n += (await spec.table().toArray()).filter(r => !!r.syncPending).length
    }
    for (const spec of SINGLETONS) {
      if ((await spec.table().get(1))?.syncPending) n += 1
    }
    return n
  }

  private async runOnce(userId: string, pull: boolean): Promise<{ push: string[]; pull: string[]; pulled: boolean }> {
    const errors = { push: [] as string[], pull: [] as string[], pulled: false }
    // Once the server is unreachable, skip the remaining tables instead of waiting
    // for each request to time out; the next trigger (reconnect, foreground, a write) retries.
    let unreachable = false
    const guard = async (phase: 'push' | 'pull', what: string, fn: () => Promise<void>) => {
      if (unreachable) return
      try {
        await fn()
      } catch (err) {
        const msg = err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err ? String((err as { message: unknown }).message) : String(err)
        errors[phase].push(`${phase} ${what}: ${msg}`)
        if (NETWORK_ERROR.test(msg)) unreachable = true
      }
    }

    for (const spec of COLLECTIONS) await guard('push', spec.remote, () => this.pushCollection(spec, userId))
    for (const spec of SINGLETONS) await guard('push', spec.remote, () => this.pushSingleton(spec, userId))
    await guard('push', 'deletions', () => this.pushDeletions(userId))

    // Pull (skip if the user signed out meanwhile). Every table at once: one after another was
    // seventeen round trips, each waiting for the last, on a connection that carries them together.
    if (pull && this.userId === userId && !unreachable) {
      errors.pulled = true
      await Promise.all([
        ...COLLECTIONS.map(spec => guard('pull', spec.remote, () => this.pullCollection(spec, userId))),
        ...SINGLETONS.map(spec => guard('pull', spec.remote, () => this.pullSingleton(spec, userId))),
      ])
    }
    return errors
  }

  private async pushCollection(spec: CollectionSpec, userId: string): Promise<void> {
    const table = spec.table()
    const seen = writesTo(table)
    if (this.clean.get(spec.remote) === seen) return
    // The whole table in one request, then picked through: walking it a row at a time (`filter`) took seven times as long
    const pending = (await table.toArray())
      .filter(r => !!r.syncPending && (spec.shouldPush?.(r as SyncRow & Record<string, unknown>) ?? true))
    let cleared = 0 // commits of our own below

    const send = async (part: SyncRow[]): Promise<Error | null> => {
      // deleted: false, because a row here is alive: one deleted and then written again under the
      // same id (a weigh-in's is its date) would otherwise stay deleted on the server
      const records = part.map(r => ({ ...toRemote(r as Record<string, unknown>, spec.columns, userId), deleted: false }))
      const { error } = await sb.from(spec.remote).upsert(records, { onConflict: 'user_id,uuid' })
      if (error) return new Error(error.message)

      // Clear the flag only on rows that weren't edited again while we pushed.
      await db.transaction('rw', table, async () => {
        const current = await table.bulkGet(part.map(r => r.uuid))
        const done = current.filter((c, i): c is SyncRow => !!c && c.syncPending === true && c.updatedAt === part[i].updatedAt)
        if (done.length > 0) {
          await table.bulkPut(done.map(c => ({ ...c, syncPending: false })))
          cleared += 1
        }
      })
      return null
    }
    for (const part of chunk(pending, PUSH_CHUNK)) {
      const error = await sendEachOnRefusal(part, send)
      if (error) throw error
    }
    // Nothing left to push, unless something else wrote to the table meanwhile: then the next sync looks again
    if (writesTo(table) === seen + cleared) this.clean.set(spec.remote, seen + cleared)
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
      if (puts.length > 0 && spec.remote === 'foods') forgetCatalog() // a favorite built-in comes back as it was saved
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
