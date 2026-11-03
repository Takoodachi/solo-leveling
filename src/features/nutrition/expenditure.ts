import { differenceInCalendarDays, parseISO, subDays } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { useNow } from '@/hooks/useNow'
import { toDateStr } from '@/lib/date'
import { loadStepBurns } from '@/lib/stepCalories'
import { weightSlope, type Weighed } from '@/lib/weightTrend'

/**
 * What the body really burns, read off the logs instead of a formula: over a few weeks,
 * energy out = energy in − what the change in weight is worth. Someone eating 2,300 kcal a day
 * while losing 0.25 kg a week is burning about 2,575. It's the idea behind "adaptive" calorie
 * apps, and it beats any formula once there's enough data, because it includes everything a
 * formula has to guess (build, job, training, fidgeting).
 *
 * It's only as good as the food log. A day with half its food missing would pull the estimate
 * down, so days far under the person's usual intake are left out as incomplete, and the
 * callers still check the result against a resting body before using it. Recent days count
 * more (half as much every two weeks back), so a change in how someone lives shows within
 * weeks, as in the adaptive apps (MacroFactor weights its trend toward recent readings too).
 */

const WINDOW_DAYS = 28
/** Needed before it says anything: two weeks of food, and weigh-ins spread over two weeks. */
const MIN_FOOD_DAYS = 14
const MIN_WEIGH_INS = 4
const MIN_SPAN_DAYS = 14
/** A kilogram of body weight gained or lost is worth about this much (the usual figure for mixed tissue). */
const KCAL_PER_KG = 7700
/** A logged day under this share of the usual one is taken as partly logged. */
const PARTIAL_SHARE = 0.5
/** A day counts half as much this many days further back. */
const HALF_LIFE_DAYS = 14
/** The last two weeks, whose logging the weekly check-in needs to be current. */
const RECENT_DAYS = 14

export type Expenditure =
  | {
      ready: true
      /** Burned per day, everything included. */
      kcal: number
      /** Eaten per day, on the days counted. */
      eaten: number
      /** Of `kcal`, what walking accounts for (0 when step calories are switched off). */
      walked: number
      /** `kcal` without the walking: what a calorie target means while steps are subtracted day by day. */
      maintenance: number
      kgPerWeek: number
      foodDays: number
      /** Of `foodDays`, those in the last two weeks. */
      recentDays: number
      weighIns: number
    }
  | { ready: false; foodDays: number; weighIns: number; spanDays: number }

export const EXPENDITURE_NEEDS = { foodDays: MIN_FOOD_DAYS, weighIns: MIN_WEIGH_INS, spanDays: MIN_SPAN_DAYS, windowDays: WINDOW_DAYS }

const round10 = (n: number) => Math.round(n / 10) * 10
/** The mean of `ys`, each counted by its weight. */
const weightedMean = (ys: number[], ws: number[]) => ys.reduce((sum, y, i) => sum + y * ws[i], 0) / ws.reduce((a, b) => a + b, 0)

/** The best-fit line's slope through (x, y) points, each counted by its weight. */
function weightedSlope(xs: number[], ys: number[], ws: number[]): number | null {
  const mx = weightedMean(xs, ws)
  const my = weightedMean(ys, ws)
  let top = 0
  let bottom = 0
  xs.forEach((x, i) => {
    top += ws[i] * (x - mx) * (ys[i] - my)
    bottom += ws[i] * (x - mx) ** 2
  })
  return bottom > 0 ? top / bottom : null
}

/** The estimate from a window's numbers: kcal eaten per day, weigh-ins, and kcal walked per day, as of `today`. */
export function estimateExpenditure(eatenByDay: Map<string, number>, weighIns: Weighed[], walkedByDay: Map<string, number>, today: string): Expenditure {
  const logged = [...eatenByDay].filter(([, kcal]) => kcal > 0)
  const usual = logged.map(([, kcal]) => kcal).sort((a, b) => a - b)[Math.floor(logged.length / 2)] ?? 0
  const days = logged.filter(([, kcal]) => kcal >= usual * PARTIAL_SHARE)
  const dates = weighIns.map(w => w.date).sort()
  const spanDays = dates.length > 1 ? differenceInCalendarDays(parseISO(dates[dates.length - 1]), parseISO(dates[0])) : 0
  const age = (date: string) => differenceInCalendarDays(parseISO(today), parseISO(date))
  const weightOf = (date: string) => 0.5 ** (age(date) / HALF_LIFE_DAYS)
  const slope = weightSlope(weighIns) != null
    ? weightedSlope(weighIns.map(w => -age(w.date)), weighIns.map(w => w.weightKg), weighIns.map(w => weightOf(w.date)))
    : null
  if (days.length < MIN_FOOD_DAYS || weighIns.length < MIN_WEIGH_INS || spanDays < MIN_SPAN_DAYS || slope == null) {
    return { ready: false, foodDays: days.length, weighIns: weighIns.length, spanDays }
  }

  const counted = days.map(([date]) => weightOf(date))
  const eaten = weightedMean(days.map(([, kcal]) => kcal), counted)
  const walked = weightedMean(days.map(([date]) => walkedByDay.get(date) ?? 0), counted)
  const kcal = eaten - slope * KCAL_PER_KG
  return {
    ready: true,
    kcal: round10(kcal),
    eaten: round10(eaten),
    walked: round10(walked),
    maintenance: round10(kcal - walked),
    kgPerWeek: Math.round(slope * 7 * 100) / 100,
    foodDays: days.length,
    recentDays: days.filter(([date]) => age(date) <= RECENT_DAYS).length,
    weighIns: weighIns.length,
  }
}

/** The estimate for the four weeks before `today` (today itself isn't over yet). */
export async function loadExpenditure(today: string): Promise<Expenditure> {
  const start = toDateStr(subDays(parseISO(today), WINDOW_DAYS))
  const end = toDateStr(subDays(parseISO(today), 1))
  const [logs, weighIns] = await Promise.all([
    db.foodLog.where('date').between(start, end, true, true).toArray(),
    db.bodyMetrics.where('date').between(start, today, true, true).toArray(),
  ])
  const foods = await db.foods.bulkGet([...new Set(logs.map(l => l.foodId))])
  const kcalOf = new Map(foods.flatMap(f => (f ? [[f.uuid, f.kcalPerServing] as const] : [])))
  const eaten = new Map<string, number>()
  for (const l of logs) eaten.set(l.date, (eaten.get(l.date) ?? 0) + (kcalOf.get(l.foodId) ?? 0) * l.servings)

  const burns = await loadStepBurns([...eaten.keys()])
  const walked = new Map([...burns].map(([date, burn]) => [date, burn.kcal]))
  return estimateExpenditure(eaten, weighIns, walked, today)
}

/** Live: undefined while it loads. */
export function useExpenditure(): Expenditure | undefined {
  const today = toDateStr(useNow())
  return useLiveQuery(() => loadExpenditure(today), [today])
}
