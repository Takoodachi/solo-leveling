import { addDays } from 'date-fns'
import { db } from '@/db'
import type { Workout, WorkoutSet } from '@/types'
import { est1RM, setVolume } from '@/lib/workoutMath'
import { loadStepBurns } from '@/lib/stepCalories'
import { computeRanks } from '@/features/ranks/computeRanks'
import type { RankInfo } from '@/features/ranks/tiers'
import { DEFAULT_STEP_GOAL, DEFAULT_WATER_GOAL_ML } from '@/features/settings/hooks/useSettings'
import { periodDates, periodStart, shiftPeriod, type RecapPeriod } from './period'

/**
 * A week, month or year in review: training, new bests, rank, steps, food and habits, each next
 * to the period before. Built on the device from what's logged; nothing is stored.
 */

export interface PeriodTraining {
  workouts: number
  activeMin: number
  sets: number
  volume: number
  cardioKm: number
}

export interface RecapBest {
  exerciseId: string
  name: string
  /** est. 1RM in kg for lifts, km for cardio. */
  from: number
  to: number
  kind: '1rm' | 'distance'
}

export interface Recap {
  period: RecapPeriod
  dates: string[]
  /** First day in the period with anything logged: per-day figures count from here, so a year that started in the app in September isn't averaged over January too. */
  since: string
  /** Nothing at all was logged in the period. */
  empty: boolean
  training: PeriodTraining
  previous: PeriodTraining & { steps: number }
  /** The weekly workout goal, scaled to the period's length. */
  workoutGoal: number
  bests: RecapBest[]
  /** Overall strength rank going into the period and at its end (null while unranked). */
  rank: { from: RankInfo | null; to: RankInfo } | null
  steps: { total: number; goal: number; goalDays: number; best: { date: string; steps: number } | null }
  /** Days with food logged; net = eaten minus step calories, averaged over those days. */
  food: { days: number; avgNetKcal: number; targetKcal: number; avgProtein: number; proteinDays: number } | null
  /** The last weigh-in before the period (else the first in it) and the last one in it. */
  weight: { from: number; to: number } | null
  creatineDays: number
  waterGoalDays: number
}

/** Monday of the week before the one containing `now`. */
export function lastWeekStart(now: Date): string {
  return periodStart('week', addDays(now, -7))
}

function trainingOf(workouts: Workout[], sets: WorkoutSet[], cardio: Set<string>): PeriodTraining {
  const lifts = sets.filter(s => !cardio.has(s.exerciseId))
  return {
    workouts: workouts.length,
    activeMin: workouts.reduce((n, w) => n + w.durationMin, 0),
    sets: lifts.length,
    volume: lifts.reduce((n, s) => n + setVolume(s), 0),
    cardioKm: sets.reduce((n, s) => n + (cardio.has(s.exerciseId) ? (s.distanceKm ?? 0) : 0), 0),
  }
}

const best1RM = (sets: WorkoutSet[]) => Math.max(0, ...sets.filter(s => s.weight && s.reps).map(s => est1RM(s.weight ?? 0, s.reps ?? 0)))
const longest = (sets: WorkoutSet[]) => Math.max(0, ...sets.map(s => s.distanceKm ?? 0))

/** Lifts and runs whose best in the period beat everything logged before it. */
async function bestsOf(periodSets: WorkoutSet[], first: string, last: string, cardio: Set<string>): Promise<RecapBest[]> {
  const bests: RecapBest[] = []
  for (const exerciseId of new Set(periodSets.map(s => s.exerciseId))) {
    const all = await db.workoutSets.where('exerciseId').equals(exerciseId).toArray()
    const dates = new Map((await db.workouts.bulkGet([...new Set(all.map(s => s.workoutId))])).flatMap(w => (w ? [[w.uuid, w.date]] : [])))
    const before = all.filter(s => (dates.get(s.workoutId) ?? last) < first)
    const during = all.filter(s => { const d = dates.get(s.workoutId); return !!d && d >= first && d <= last })
    const isCardio = cardio.has(exerciseId)
    const [from, to] = isCardio ? [longest(before), longest(during)] : [best1RM(before), best1RM(during)]
    // A first-ever session has nothing to beat
    if (from <= 0 || to <= from) continue
    const name = (await db.exercises.get(exerciseId))?.name ?? 'Exercise'
    bests.push({ exerciseId, name, from: Math.round(from * 10) / 10, to: Math.round(to * 10) / 10, kind: isCardio ? 'distance' : '1rm' })
  }
  return bests.sort((a, b) => b.to / b.from - a.to / a.from)
}

export async function buildRecap(period: RecapPeriod, start: string): Promise<Recap> {
  const dates = periodDates(period, start)
  const [first, last] = [dates[0], dates[dates.length - 1]]
  const prevFirst = shiftPeriod(period, first, -1)

  const [workouts, activity, logs, weighIns, checkins, settings, targets, routines] = await Promise.all([
    db.workouts.where('date').between(prevFirst, last, true, true).toArray(),
    db.dailyActivity.where('date').between(prevFirst, last, true, true).toArray(),
    db.foodLog.where('date').between(first, last, true, true).toArray(),
    db.bodyMetrics.orderBy('date').toArray(),
    db.checkins.where('date').between(first, last, true, true).toArray(),
    db.settings.get(1),
    db.targets.get(1),
    db.routines.toArray(),
  ])
  const sets = workouts.length ? await db.workoutSets.where('workoutId').anyOf(workouts.map(w => w.uuid)).toArray() : []
  const exercises = await db.exercises.bulkGet([...new Set(sets.map(s => s.exerciseId))])
  const cardio = new Set(exercises.flatMap(e => (e?.type === 'cardio' ? [e.uuid] : [])))

  const inPeriod = (w: Workout) => w.date >= first
  const current = workouts.filter(inPeriod)
  const earlier = workouts.filter(w => !inPeriod(w))
  const setsOf = (ws: Workout[]) => { const ids = new Set(ws.map(w => w.uuid)); return sets.filter(s => ids.has(s.workoutId)) }
  const periodSets = setsOf(current)

  const stepsByDay = new Map<string, number>()
  for (const a of activity) stepsByDay.set(a.date, Math.max(stepsByDay.get(a.date) ?? 0, a.steps))
  const periodSteps = dates.map(date => ({ date, steps: stepsByDay.get(date) ?? 0 }))
  const stepGoal = settings?.dailyStepGoal ?? DEFAULT_STEP_GOAL
  const bestDay = periodSteps.reduce((a, d) => (d.steps > a.steps ? d : a), periodSteps[0])
  const previousSteps = [...stepsByDay].reduce((n, [date, steps]) => n + (date < first ? steps : 0), 0)

  const foods = await db.foods.bulkGet([...new Set(logs.map(l => l.foodId))])
  const foodById = new Map(foods.flatMap(f => (f ? [[f.uuid, f]] : [])))
  const eaten = new Map<string, { kcal: number; protein: number }>()
  for (const l of logs) {
    const f = foodById.get(l.foodId)
    if (!f) continue
    const day = eaten.get(l.date) ?? { kcal: 0, protein: 0 }
    eaten.set(l.date, { kcal: day.kcal + f.kcalPerServing * l.servings, protein: day.protein + f.protein * l.servings })
  }
  const burns = await loadStepBurns([...eaten.keys()])
  const foodDays = [...eaten].map(([date, e]) => ({ ...e, net: e.kcal - (burns.get(date)?.kcal ?? 0) }))
  const proteinTarget = targets?.dailyProtein ?? 0

  const during = weighIns.filter(m => m.date >= first && m.date <= last)
  const before = weighIns.filter(m => m.date < first).at(-1)

  const [rankBefore, rankAfter] = await Promise.all([computeRanks(w => w.date < first), computeRanks(w => w.date <= last)])
  const waterGoal = settings?.waterGoalMl ?? DEFAULT_WATER_GOAL_ML
  const scheduled = new Set(routines.flatMap(r => r.scheduleDays))
  const training = trainingOf(current, periodSets, cardio)

  const logged = [
    ...current.map(w => w.date), ...periodSteps.filter(d => d.steps > 0).map(d => d.date), ...logs.map(l => l.date),
    ...checkins.filter(c => c.done).map(c => c.date), ...during.map(m => m.date),
  ]
  return {
    period,
    dates,
    since: logged.length ? logged.reduce((a, d) => (d < a ? d : a)) : first,
    empty: current.length === 0 && logs.length === 0 && periodSteps.every(d => d.steps === 0) && during.length === 0 && checkins.every(c => !c.done),
    training,
    previous: { ...trainingOf(earlier, setsOf(earlier), cardio), steps: previousSteps },
    workoutGoal: Math.round(((settings?.weeklyWorkoutGoal ?? Math.max(3, scheduled.size)) * dates.length) / 7),
    bests: await bestsOf(periodSets, first, last, cardio),
    rank: rankAfter.overall ? { from: rankBefore.overall, to: rankAfter.overall } : null,
    steps: {
      total: periodSteps.reduce((n, d) => n + d.steps, 0),
      goal: stepGoal,
      goalDays: periodSteps.filter(d => d.steps >= stepGoal).length,
      best: bestDay.steps > 0 ? bestDay : null,
    },
    food: foodDays.length
      ? {
          days: foodDays.length,
          avgNetKcal: Math.round(foodDays.reduce((n, d) => n + d.net, 0) / foodDays.length),
          targetKcal: targets?.dailyKcal ?? 0,
          avgProtein: Math.round(foodDays.reduce((n, d) => n + d.protein, 0) / foodDays.length),
          proteinDays: proteinTarget > 0 ? foodDays.filter(d => d.protein >= proteinTarget).length : 0,
        }
      : null,
    weight: during.length ? { from: (before ?? during[0]).weightKg, to: during[during.length - 1].weightKg } : null,
    creatineDays: checkins.filter(c => c.key === 'creatine' && c.done).length,
    waterGoalDays: checkins.filter(c => c.key === 'water' && (c.amount ?? 0) >= waterGoal).length,
  }
}
