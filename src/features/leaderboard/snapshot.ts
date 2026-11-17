import { startOfWeek, subDays } from 'date-fns'
import { streakAlive } from '@/lib/streak'
import { db } from '@/db'
import { exercisesById, setsOfWorkouts } from '@/db/read'
import type { UserStats } from '@/types'
import { toDateStr } from '@/lib/date'
import { computeRanks, describeBest, describeRun, rankHistory } from '@/features/ranks/computeRanks'
import { isRunExercise } from '@/features/ranks/running'
import { showsRoutines } from './api'
import type { Highlight, LeaderboardSnapshot, SharedRoutine, SharedSet } from './types'

const HISTORY_WEEKS = 12
const HIGHLIGHT_DAYS = 14
const TOP_LIFTS = 5

/** A best set as numbers, for friends to read in their own units. */
function sharedSet(b: { weight?: number; reps?: number; duration?: number }): SharedSet {
  return { ...(b.weight ? { w: b.weight } : {}), ...(b.reps ? { r: b.reps } : {}), ...(b.duration ? { d: b.duration } : {}) }
}

/** The streak as it stands today: one last logged more than three missed days ago has lapsed. */
function liveStreak(stats: UserStats | undefined, now: Date): number {
  return stats && streakAlive(stats.lastLogDate, toDateStr(now)) ? stats.currentStreak : 0
}

async function weekTotals(weekStart: string): Promise<LeaderboardSnapshot['week']> {
  const workouts = await db.workouts.where('date').aboveOrEqual(weekStart).toArray()
  const [sets, exerciseOf] = await Promise.all([setsOfWorkouts(workouts.map(w => w.uuid)), exercisesById()])
  const runKm = sets.reduce((km, s) => km + (isRunExercise(s.exerciseId) ? s.distanceKm ?? 0 : 0), 0)
  return {
    start: weekStart,
    workouts: workouts.length,
    sets: sets.filter(s => exerciseOf.get(s.exerciseId)?.type !== 'cardio').length,
    minutes: Math.round(workouts.reduce((m, w) => m + (w.durationMin || 0), 0)),
    runKm: Math.round(runKm * 10) / 10,
  }
}

/** Your routines as friends see them, their custom exercises described (a friend's device doesn't have them) and their notes left out. */
async function myRoutines(): Promise<SharedRoutine[]> {
  const [routines, exerciseOf] = await Promise.all([db.routines.orderBy('name').toArray(), exercisesById()])
  return routines.map(r => ({
    id: r.uuid,
    name: r.name,
    category: r.category,
    level: r.level,
    ...(r.estDurationMin ? { mins: r.estDurationMin } : {}),
    days: r.scheduleDays,
    items: r.exercises.map(x => {
      const c = exerciseOf.get(x.exerciseId)
      return { id: x.exerciseId, sets: x.sets, reps: x.reps, rest: x.restSec, ...(c?.isCustom ? { ex: { name: c.name, category: c.category, type: c.type, unit: c.defaultUnit } } : {}) }
    }),
  }))
}

/** Everything this account shares on the leaderboard, from local data. */
export async function buildMySnapshot(now = new Date()): Promise<LeaderboardSnapshot> {
  const weekStart = toDateStr(startOfWeek(now, { weekStartsOn: 1 }))
  const since = toDateStr(subDays(now, HIGHLIGHT_DAYS))
  // The ranks first: the history is worked out from the same rated sets, which are kept once read
  const ranks = await computeRanks()
  const [history, stats, week, settings, routines] = await Promise.all([
    rankHistory(HISTORY_WEEKS), db.userStats.get(1), weekTotals(weekStart), db.settings.get(1), myRoutines(),
  ])

  const run = ranks.running
  const highlights: Highlight[] = ranks.lifts
    .filter(l => l.best.date >= since)
    .map(l => ({ kind: 'lift' as const, name: l.name, rating: l.rank.rating, detail: describeBest(l.best, 'kg'), set: sharedSet(l.best), date: l.best.date }))
  if (run && run.best.date >= since) {
    highlights.push({
      kind: 'run', name: 'Running', rating: run.rank.rating,
      detail: describeRun(run.best), date: run.best.date,
    })
  }

  return {
    v: 1,
    level: stats?.level ?? 1,
    xp: stats?.xp ?? 0,
    streak: liveStreak(stats, now),
    overall: ranks.overall?.rating ?? null,
    groups: Object.fromEntries(ranks.groups.flatMap(g => (g.rank ? [[g.key, g.rank.rating]] : []))),
    regions: Object.fromEntries(ranks.regions.flatMap(r => (r.rank ? [[r.key, { r: r.rank.rating, by: r.topLift ?? '' }]] : []))),
    running: run && {
      rating: run.rank.rating,
      fiveK: Math.round(run.best.equivalent5k * 100) / 100,
      distanceKm: run.best.distanceKm,
      duration: run.best.duration,
      date: run.best.date,
    },
    lifts: ranks.lifts.slice(0, TOP_LIFTS).map(l => ({ name: l.name, rating: l.rank.rating, best: describeBest(l.best, 'kg'), set: sharedSet(l.best), date: l.best.date })),
    history: history.map(p => ({ d: p.date, o: p.overall, r: p.running })),
    week,
    highlights: highlights.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6),
    ...(settings?.avatar ? { avatar: settings.avatar } : {}),
    ...(routines.length && showsRoutines(settings) ? { routines } : {}),
  }
}
