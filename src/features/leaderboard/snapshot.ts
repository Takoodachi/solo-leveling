import { differenceInCalendarDays, parseISO, startOfWeek, subDays } from 'date-fns'
import { db } from '@/db'
import type { UserStats } from '@/types'
import { toDateStr } from '@/lib/date'
import { formatKm } from '@/lib/cardio'
import { computeRanks, describeBest, rankHistory } from '@/features/ranks/computeRanks'
import { formatRunTime, isRunExercise } from '@/features/ranks/running'
import type { Highlight, LeaderboardSnapshot } from './types'

const HISTORY_WEEKS = 12
const HIGHLIGHT_DAYS = 14
const TOP_LIFTS = 5

/** The streak as it stands today: a streak whose last log is older than the banked freezes cover has lapsed. */
function liveStreak(stats: UserStats | undefined, now: Date): number {
  if (!stats?.lastLogDate) return 0
  const gap = differenceInCalendarDays(now, parseISO(stats.lastLogDate))
  return gap <= 1 + (stats.streakFreezes ?? 0) ? stats.currentStreak : 0
}

async function weekTotals(weekStart: string): Promise<LeaderboardSnapshot['week']> {
  const workouts = await db.workouts.where('date').aboveOrEqual(weekStart).toArray()
  const sets = workouts.length ? await db.workoutSets.where('workoutId').anyOf(workouts.map(w => w.uuid)).toArray() : []
  const exercises = await db.exercises.bulkGet([...new Set(sets.map(s => s.exerciseId))])
  const cardio = new Set(exercises.flatMap(e => (e?.type === 'cardio' ? [e.uuid] : [])))
  const runKm = sets.reduce((km, s) => km + (isRunExercise(s.exerciseId) ? s.distanceKm ?? 0 : 0), 0)
  return {
    start: weekStart,
    workouts: workouts.length,
    sets: sets.filter(s => !cardio.has(s.exerciseId)).length,
    minutes: Math.round(workouts.reduce((m, w) => m + (w.durationMin || 0), 0)),
    runKm: Math.round(runKm * 10) / 10,
  }
}

/** Everything this account shares on the leaderboard, from local data. */
export async function buildMySnapshot(now = new Date()): Promise<LeaderboardSnapshot> {
  const weekStart = toDateStr(startOfWeek(now, { weekStartsOn: 1 }))
  const since = toDateStr(subDays(now, HIGHLIGHT_DAYS))
  const [ranks, history, stats, week] = await Promise.all([computeRanks(), rankHistory(HISTORY_WEEKS), db.userStats.get(1), weekTotals(weekStart)])

  const run = ranks.running
  const highlights: Highlight[] = ranks.lifts
    .filter(l => l.best.date >= since)
    .map(l => ({ kind: 'lift' as const, name: l.name, rating: l.rank.rating, detail: describeBest(l.best), date: l.best.date }))
  if (run && run.best.date >= since) {
    highlights.push({
      kind: 'run', name: 'Running', rating: run.rank.rating,
      detail: `${formatKm(run.best.distanceKm)} in ${formatRunTime(run.best.duration)}`, date: run.best.date,
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
    lifts: ranks.lifts.slice(0, TOP_LIFTS).map(l => ({ name: l.name, rating: l.rank.rating, best: describeBest(l.best), date: l.best.date })),
    history: history.map(p => ({ d: p.date, o: p.overall, r: p.running })),
    week,
    highlights: highlights.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6),
  }
}
