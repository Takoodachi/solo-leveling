import { differenceInCalendarDays, parseISO } from 'date-fns'
import { db } from '@/db'
import { setVolume } from '@/lib/workoutMath'
import { computeRanks } from '@/features/ranks/computeRanks'
import { isRunExercise } from '@/features/ranks/running'
import { DEFAULT_STEP_GOAL, DEFAULT_WATER_GOAL_ML } from '@/features/settings/hooks/useSettings'
import type { AchievementMetric } from './achievements'

export type StatReader = (metric: AchievementMetric) => Promise<number>

/**
 * The numbers achievements count, read from what's logged. One reader loads each source at most
 * once, and only when a metric from it is asked for: checking a few locked achievements after a
 * food log doesn't walk every set, and the ranks are only worked out for a rank achievement.
 */
export function achievementStats(): StatReader {
  const once = <T>(load: () => Promise<T>) => {
    let loading: Promise<T> | undefined
    return () => (loading ??= load())
  }

  const stats = once(() => db.userStats.get(1))
  const settings = once(() => db.settings.get(1))

  const training = once(async () => {
    const sets = await db.workoutSets.toArray()
    const ids = [...new Set(sets.map(s => s.exerciseId))]
    const cardio = new Set((await db.exercises.bulkGet(ids)).flatMap(e => (e?.type === 'cardio' ? [e.uuid] : [])))
    let volumeKg = 0
    let cardioKm = 0
    let longestRunKm = 0
    for (const s of sets) {
      if (!cardio.has(s.exerciseId)) volumeKg += setVolume(s)
      else {
        cardioKm += s.distanceKm ?? 0
        if (isRunExercise(s.exerciseId)) longestRunKm = Math.max(longestRunKm, s.distanceKm ?? 0)
      }
    }
    return { sets: sets.length, volumeT: volumeKg / 1000, exercises: ids.length, cardioKm, longestRunKm }
  })

  const food = once(async () => {
    const [logs, targets] = await Promise.all([db.foodLog.toArray(), db.targets.get(1)])
    const foods = await db.foods.bulkGet([...new Set(logs.map(l => l.foodId))])
    const proteinOf = new Map(foods.flatMap(f => (f ? [[f.uuid, f.protein] as const] : [])))
    const byDay = new Map<string, number>()
    for (const l of logs) byDay.set(l.date, (byDay.get(l.date) ?? 0) + (proteinOf.get(l.foodId) ?? 0) * l.servings)
    const target = targets?.dailyProtein ?? 0
    const hit = target > 0 ? [...byDay].filter(([, protein]) => protein >= target).map(([date]) => date).sort() : []
    // The longest run of days in a row at the target
    let proteinRun = 0
    let run = 0
    hit.forEach((date, i) => {
      run = i > 0 && differenceInCalendarDays(parseISO(date), parseISO(hit[i - 1])) === 1 ? run + 1 : 1
      proteinRun = Math.max(proteinRun, run)
    })
    return { foodDays: byDay.size, proteinDays: hit.length, proteinRun }
  })

  const steps = once(async () => {
    const goal = (await settings())?.dailyStepGoal ?? DEFAULT_STEP_GOAL
    const byDay = new Map<string, number>()
    for (const a of await db.dailyActivity.toArray()) byDay.set(a.date, Math.max(byDay.get(a.date) ?? 0, a.steps))
    return [...byDay.values()].filter(n => n >= goal).length
  })

  const checkins = once(async () => {
    const goal = (await settings())?.waterGoalMl ?? DEFAULT_WATER_GOAL_ML
    const rows = await db.checkins.toArray()
    return {
      waterDays: rows.filter(c => c.key === 'water' && (c.amount ?? 0) >= goal).length,
      creatineDays: rows.filter(c => c.key === 'creatine' && c.done).length,
    }
  })

  const ranks = once(() => computeRanks())

  const read: Record<AchievementMetric, () => Promise<number>> = {
    workouts: () => db.workouts.count(),
    sets: async () => (await training()).sets,
    volumeT: async () => (await training()).volumeT,
    exercises: async () => (await training()).exercises,
    routines: () => db.routines.count(),
    rankedLifts: async () => (await ranks()).lifts.length,
    liftRating: async () => (await ranks()).lifts[0]?.rank.rating ?? 0,
    overallRating: async () => (await ranks()).overall?.rating ?? 0,
    groupsRanked: async () => (await ranks()).groups.filter(g => g.rank).length,
    runningRating: async () => (await ranks()).running?.rank.rating ?? 0,
    longestRunKm: async () => (await training()).longestRunKm,
    cardioKm: async () => (await training()).cardioKm,
    longestStreak: async () => (await stats())?.longestStreak ?? 0,
    level: async () => (await stats())?.level ?? 1,
    foodDays: async () => (await food()).foodDays,
    proteinRun: async () => (await food()).proteinRun,
    proteinDays: async () => (await food()).proteinDays,
    weighIns: () => db.bodyMetrics.count(),
    stepGoalDays: () => steps(),
    waterDays: async () => (await checkins()).waterDays,
    creatineDays: async () => (await checkins()).creatineDays,
  }
  return metric => read[metric]()
}
