import { db } from '@/db'
import { requestSync } from '@/lib/sync'
import { soloHas, soloPlugin } from '@/lib/native'
import { estimateWorkoutKcal, liftMetFromHeartRate, setModeFor } from '@/lib/workoutMath'
import { getWorkoutWithSets } from '@/features/workouts/hooks/useWorkoutHistory'

/**
 * Android app: a workout's average heart rate, from Health Connect (the watch's readings, which
 * Samsung Health passes on, often a while after the workout), and the calorie estimate that
 * follows from it. The phone notes a workout's real start and end when it's finished live
 * (`awaitHeartRate`); each launch and return looks again, for three days. A heart rate typed in
 * is never replaced, and a workout logged for a day that has passed is left out: its start time
 * is made up. Import lazily, behind `isAndroidApp()`.
 */

const KEY = 'solo:heartRatePending'
const KEEP_MS = 3 * 86_400_000
/** Fewer readings than this over a workout is a watch that wasn't worn for it. */
const MIN_READINGS = 3

interface Pending { id: string; start: number; end: number }

function pending(): Pending[] {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(list) ? (list as Pending[]) : []
  } catch {
    return []
  }
}

function save(list: Pending[]): void {
  try {
    if (list.length) localStorage.setItem(KEY, JSON.stringify(list))
    else localStorage.removeItem(KEY)
  } catch {
    // not kept: this workout just won't get a heart rate
  }
}

/** A workout just finished live: look for its heart rate now and on the next few launches. */
export function awaitHeartRate(id: string, start: number, end: number): Promise<void> {
  save([...pending().filter(p => p.id !== id), { id, start, end }])
  return fillHeartRates()
}

async function kcalWith(id: string, avgBpm: number): Promise<number | undefined> {
  const w = await getWorkoutWithSets(id)
  if (!w) return undefined
  // Bodyweight on the workout's day, as when editing it
  const weighIn = (await db.bodyMetrics.where('date').belowOrEqual(w.date).last()) ?? (await db.bodyMetrics.orderBy('date').first())
  return estimateWorkoutKcal({
    durationMin: w.durationMin,
    bodyKg: weighIn?.weightKg,
    liftMet: liftMetFromHeartRate(avgBpm),
    cardio: w.sets.filter(s => setModeFor(s.exercise) === 'cardio'),
  })
}

async function run(): Promise<void> {
  const list = pending()
  if (!list.length || !soloHas('heartRate')) return
  const plugin = await soloPlugin()
  if (!plugin) return
  const done = new Set<string>()
  for (const p of list) {
    const workout = await db.workouts.get(p.id)
    if (!workout || workout.avgHeartRate || Date.now() - p.end > KEEP_MS) {
      done.add(p.id)
      continue
    }
    const hr = await plugin.heartRate({ start: p.start, end: p.end }).catch(() => null)
    if (!hr?.granted || !hr.avg || (hr.count ?? 0) < MIN_READINGS) continue
    const avg = Math.round(hr.avg)
    const kcalEst = (await kcalWith(p.id, avg)) ?? workout.kcalEst
    await db.workouts.update(p.id, { avgHeartRate: avg, kcalEst, updatedAt: Date.now(), syncPending: true })
    done.add(p.id)
  }
  // Read again: a workout may have been finished while this ran
  save(pending().filter(p => !done.has(p.id)))
  if (list.some(p => done.has(p.id))) requestSync()
}

let running: Promise<void> | null = null

/** Fills in what has arrived for the workouts waiting on a heart rate. Overlapping calls share a run. */
export function fillHeartRates(): Promise<void> {
  running ??= run().finally(() => {
    running = null
  })
  return running
}
