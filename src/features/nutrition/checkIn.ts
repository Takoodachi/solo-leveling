import { useEffect, useState } from 'react'
import { parseISO, startOfWeek, subDays } from 'date-fns'
import { db } from '@/db'
import { toDateStr } from '@/lib/date'
import { requestSync } from '@/lib/sync'
import { clamp } from '@/lib/utils'
import { LOWEST_BELIEVABLE, goalPace, macrosFor, restingKcal, suggestedTargets, type GoalType, type TargetValues } from '@/features/settings/targetSuggestion'
import { loadExpenditure } from './expenditure'

/**
 * The weekly check-in (November 2026, the owner's pick: it asks, it doesn't change targets by
 * itself). Once a week, with enough recent logs, it works out the targets for the week ahead:
 * what the logs say is burned (`expenditure.ts`, walking left out while steps are subtracted day
 * by day), plus or minus the goal's pace, with macros by body weight (`targetSuggestion.ts`).
 * Guards, since it's only as good as the logs: at most 150 kcal of change a week, never under
 * 1.1 × resting or 1,200 kcal, and nothing until 10 of the last 14 days are logged. It works from
 * what was eaten, not the old targets, so eating over them is never answered with less.
 * Training under half the planned days on a bulk halves the surplus: food without the training
 * mostly goes to fat. Answered (applied or kept) as a check-in `targets-<Monday>`, once a week
 * across devices.
 */

const MAX_CHANGE = 150
const FLOOR = 1200
const MIN_RECENT_DAYS = 10
const COMMITMENT_DAYS = 28

export interface WeeklyCheckIn {
  /** The week's Monday. */
  week: string
  goal: GoalType
  /** % of body weight a week the targets aim for (negative = losing). */
  pace: number
  /** Burned per day, everything included. */
  burn: number
  current: TargetValues
  next: TargetValues
  /** The change was held to `MAX_CHANGE`. */
  held: boolean
  /** Planned workouts done in the last four weeks; null without a plan. */
  workouts: { planned: number; done: number } | null
  /** A bulk's surplus halved, since training was under half the plan. */
  trimmed: boolean
}

/**
 * Planned days in the four weeks before `today` and how many had a workout. Skipped days don't
 * count either way. shortcut: it takes today's plan as the plan all along; good enough for a
 * four-week glance, upgrade if plans start changing often.
 */
export async function planCommitment(today: string): Promise<WeeklyCheckIn['workouts']> {
  const end = parseISO(today)
  const [first, last] = [toDateStr(subDays(end, COMMITMENT_DAYS)), toDateStr(subDays(end, 1))]
  const [routines, workouts, skips] = await Promise.all([
    db.routines.toArray(),
    db.workouts.where('date').between(first, last, true, true).toArray(),
    db.checkins.where('date').between(first, last, true, true).filter(c => c.key === 'skip' && c.done).toArray(),
  ])
  const weekdays = new Set(routines.flatMap(r => r.scheduleDays))
  if (weekdays.size === 0) return null
  const trained = new Set(workouts.map(w => w.date))
  const skipped = new Set(skips.map(s => s.date))
  let planned = 0
  let done = 0
  for (let back = 1; back <= COMMITMENT_DAYS; back++) {
    const day = subDays(end, back)
    const date = toDateStr(day)
    if (!weekdays.has(day.getDay()) || skipped.has(date)) continue
    planned++
    if (trained.has(date)) done++
  }
  return { planned, done }
}

/** This week's check-in, or null: already answered, not enough logs yet, or nothing would change. */
export async function loadCheckIn(today: string): Promise<WeeklyCheckIn | null> {
  const week = toDateStr(startOfWeek(parseISO(today), { weekStartsOn: 1 }))
  const [answered, settings, targets, weighIn] = await Promise.all([
    db.checkins.get(`targets-${week}`),
    db.settings.get(1),
    db.targets.get(1),
    db.bodyMetrics.orderBy('date').last(),
  ])
  if (answered || !targets || !weighIn || !settings?.sex || !settings.heightCm) return null
  const measured = await loadExpenditure(today)
  if (!measured.ready || measured.recentDays < MIN_RECENT_DAYS) return null
  const resting = restingKcal(weighIn.weightKg, settings.heightCm, settings.sex)
  // Less than a resting body burns: food went unlogged, and new targets would be guesses
  if (measured.kcal < resting * LOWEST_BELIEVABLE) return null

  const goal = settings.goalType ?? 'maintain'
  const workouts = await planCommitment(today)
  const trimmed = goal === 'bulk' && !!workouts && workouts.planned >= 4 && workouts.done / workouts.planned < 0.5
  const pace = goalPace(goal, settings.goalPace, settings.trainingSince, today) / (trimmed ? 2 : 1)

  const ideal = suggestedTargets(weighIn.weightKg, goal, measured.maintenance, pace, settings.heightCm)
  const current: TargetValues = { dailyKcal: targets.dailyKcal, dailyProtein: targets.dailyProtein, dailyCarbs: targets.dailyCarbs, dailyFat: targets.dailyFat }
  const kcal = Math.max(Math.max(FLOOR, Math.round((resting * LOWEST_BELIEVABLE) / 10) * 10), clamp(ideal.dailyKcal, [current.dailyKcal - MAX_CHANGE, current.dailyKcal + MAX_CHANGE]))
  const next = macrosFor(kcal, weighIn.weightKg, goal, settings.heightCm)
  const same = Math.abs(next.dailyKcal - current.dailyKcal) < 20 && (['dailyProtein', 'dailyCarbs', 'dailyFat'] as const).every(k => Math.abs(next[k] - current[k]) < 5)
  if (same) return null
  return { week, goal, pace, burn: measured.kcal, current, next, held: kcal !== ideal.dailyKcal, workouts, trimmed }
}

/** Apply the week's targets, or keep the ones there are: either way, not asked again this week. */
export async function answerCheckIn(checkIn: WeeklyCheckIn, apply: boolean): Promise<void> {
  const now = Date.now()
  if (apply) await db.targets.put({ id: 1, ...checkIn.next, updatedAt: now, syncPending: true })
  await db.checkins.put({ uuid: `targets-${checkIn.week}`, date: checkIn.week, key: 'targets', done: true, amount: apply ? checkIn.next.dailyKcal : 0, updatedAt: now, syncPending: true })
  requestSync()
}

/** This week's check-in, worked out once a day (not on every log: it reads four weeks of food). */
export function useWeeklyCheckIn(today: string) {
  const [checkIn, setCheckIn] = useState<WeeklyCheckIn | null>(null)
  useEffect(() => {
    let alive = true
    void loadCheckIn(today).then(c => { if (alive) setCheckIn(c) })
    return () => { alive = false }
  }, [today])
  return [checkIn, setCheckIn] as const
}
