import { db } from '@/db'
import type { BodyMetric, Settings } from '@/types'

/**
 * Calories burned by walking, subtracted from what you ate that day.
 *
 * Only the net cost counts, i.e. what walking burns on top of resting (the daily
 * target already covers resting): about 0.5 kcal per kg of body weight per km on
 * flat ground. That's the ACSM walking equation (0.1 ml O₂ per kg per metre); a
 * treadmill study of 205 adults measured 2.22 J/kg/m (0.53 kcal/kg/km), unrelated
 * to BMI, body fat or sex, so body weight is what scales it. Distance = steps ×
 * step length, and step length ≈ 0.414 × height.
 *
 * 10,000 steps ≈ 245 kcal at 70 kg / 170 cm, ≈ 335 kcal at 90 kg / 180 cm.
 * Workouts aren't subtracted: there's no reliable way to measure what they burn.
 */
export const NET_KCAL_PER_KG_KM = 0.5
const STEP_LENGTH_PER_HEIGHT = 0.414
/** Used until the user logs a weight / sets a height. */
export const AVERAGE_BODY_KG = 70
export const AVERAGE_HEIGHT_CM = 170

export interface Body {
  weightKg?: number
  weightDate?: string // the weigh-in used
  heightCm?: number
}

export interface StepBurn {
  steps: number
  km: number
  kcal: number
  weightKg: number
  weightDate?: string // undefined = the average weight
  heightCm: number
  averageHeight: boolean
}

/** Step calories count unless switched off in Profile (kept in the old dynamic-targets flag, so no new column). */
export function countsSteps(settings: Settings | undefined): boolean {
  return settings?.dynamicTargetsEnabled !== false
}

export function stepBurn(steps: number, body: Body): StepBurn {
  const weightKg = body.weightKg && body.weightKg > 0 ? body.weightKg : AVERAGE_BODY_KG
  const averageHeight = !body.heightCm || body.heightCm < 100
  const heightCm = averageHeight ? AVERAGE_HEIGHT_CM : body.heightCm!
  const km = (steps * STEP_LENGTH_PER_HEIGHT * heightCm) / 100_000
  return {
    steps,
    km,
    kcal: Math.round(NET_KCAL_PER_KG_KM * weightKg * km),
    weightKg,
    weightDate: body.weightKg && body.weightKg > 0 ? body.weightDate : undefined,
    heightCm,
    averageHeight,
  }
}

/** The weigh-in on or before `date`, else the first one after it (closer than the average). `sorted` is by date, ascending. */
function weightOn(sorted: BodyMetric[], date: string): BodyMetric | undefined {
  let found: BodyMetric | undefined
  for (const m of sorted) {
    if (m.date > date) break
    found = m
  }
  return found ?? sorted[0]
}

/** What steps burned on each of `dates` (days with steps only). Empty when step calories are switched off. */
export async function loadStepBurns(dates: string[]): Promise<Map<string, StepBurn>> {
  const burns = new Map<string, StepBurn>()
  if (dates.length === 0) return burns
  const settings = await db.settings.get(1)
  if (!countsSteps(settings)) return burns

  const sorted = [...dates].sort()
  const wanted = new Set(dates)
  const [activity, weights] = await Promise.all([
    db.dailyActivity.where('date').between(sorted[0], sorted[sorted.length - 1], true, true).toArray(),
    db.bodyMetrics.orderBy('date').toArray(),
  ])
  const steps = new Map<string, number>()
  for (const a of activity) {
    if (wanted.has(a.date)) steps.set(a.date, Math.max(steps.get(a.date) ?? 0, a.steps))
  }
  for (const [date, n] of steps) {
    if (n <= 0) continue
    const w = weightOn(weights, date)
    burns.set(date, stepBurn(n, { weightKg: w?.weightKg, weightDate: w?.date, heightCm: settings?.heightCm }))
  }
  return burns
}

/** Weight and height that `date`'s steps are rated with, and whether step calories count at all. */
export async function loadBody(date: string): Promise<Body & { counting: boolean }> {
  const [settings, weights] = await Promise.all([db.settings.get(1), db.bodyMetrics.orderBy('date').toArray()])
  const w = weightOn(weights, date)
  return { weightKg: w?.weightKg, weightDate: w?.date, heightCm: settings?.heightCm, counting: countsSteps(settings) }
}
