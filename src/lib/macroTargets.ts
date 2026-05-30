import type { Targets, DailyActivity, Workout } from '@/types'

const KCAL_PER_STEP_PER_KG = 0.0005
const KCAL_PER_WORKOUT_MIN = 6
const DEFAULT_BODY_KG = 70

export interface DynamicBreakdown {
  baseline: { kcal: number; protein: number; carbs: number; fat: number }
  activityAvg: number          // kcal/day from activity, averaged across the window
  avgSteps: number
  avgWorkoutMin: number
  windowDays: number
  bodyKg: number
  daysCounted: number          // how many days in the window had any activity (informational)
}

export interface DynamicTargets {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface ComputeInput {
  baseline: Targets
  windowDays: number           // 3-7
  bodyKg?: number
  dailyActivity: DailyActivity[]   // any entries within the window (or wider — we filter)
  workouts: Workout[]              // any workouts within the window (we filter)
  windowDates: string[]            // YYYY-MM-DD strings, length = windowDays, excluding today
}

function clampWindow(n: number | undefined): number {
  if (!n || !Number.isFinite(n)) return 7
  return Math.min(7, Math.max(3, Math.round(n)))
}

function stepsKcalFor(steps: number, bodyKg: number): number {
  return steps * KCAL_PER_STEP_PER_KG * bodyKg
}

function workoutKcalFor(durationMin: number): number {
  return durationMin * KCAL_PER_WORKOUT_MIN
}

export function computeDynamicTargets(
  input: ComputeInput,
): { targets: DynamicTargets; breakdown: DynamicBreakdown } {
  const baseline = input.baseline
  const windowDays = clampWindow(input.windowDays)
  const bodyKg = input.bodyKg && input.bodyKg > 0 ? input.bodyKg : DEFAULT_BODY_KG
  const dateSet = new Set(input.windowDates)

  const stepsByDate = new Map<string, number>()
  for (const a of input.dailyActivity) {
    if (dateSet.has(a.date)) stepsByDate.set(a.date, (stepsByDate.get(a.date) ?? 0) + a.steps)
  }

  const workoutMinByDate = new Map<string, number>()
  for (const w of input.workouts) {
    if (dateSet.has(w.date)) workoutMinByDate.set(w.date, (workoutMinByDate.get(w.date) ?? 0) + w.durationMin)
  }

  let totalStepsKcal = 0
  let totalWorkoutKcal = 0
  let totalSteps = 0
  let totalWorkoutMin = 0
  let daysCounted = 0

  for (const d of input.windowDates) {
    const steps = stepsByDate.get(d) ?? 0
    const min = workoutMinByDate.get(d) ?? 0
    if (steps > 0 || min > 0) daysCounted += 1
    totalSteps += steps
    totalWorkoutMin += min
    totalStepsKcal += stepsKcalFor(steps, bodyKg)
    totalWorkoutKcal += workoutKcalFor(min)
  }

  // Average across the full window (not just days with activity) so quiet days drag the bonus down.
  const activityAvg = (totalStepsKcal + totalWorkoutKcal) / windowDays
  const avgSteps = totalSteps / windowDays
  const avgWorkoutMin = totalWorkoutMin / windowDays

  // Distribute extra kcal between carbs and fat, preserving baseline ratio.
  const baseC = baseline.dailyCarbs * 4
  const baseF = baseline.dailyFat * 9
  const ratioC = baseC + baseF > 0 ? baseC / (baseC + baseF) : 0.6
  const extraCarbs = (activityAvg * ratioC) / 4
  const extraFat = (activityAvg * (1 - ratioC)) / 9

  const targets: DynamicTargets = {
    kcal:    Math.round(baseline.dailyKcal + activityAvg),
    protein: baseline.dailyProtein,
    carbs:   Math.round(baseline.dailyCarbs + extraCarbs),
    fat:     Math.round(baseline.dailyFat + extraFat),
  }

  const breakdown: DynamicBreakdown = {
    baseline: {
      kcal: baseline.dailyKcal,
      protein: baseline.dailyProtein,
      carbs: baseline.dailyCarbs,
      fat: baseline.dailyFat,
    },
    activityAvg: Math.round(activityAvg),
    avgSteps: Math.round(avgSteps),
    avgWorkoutMin: Math.round(avgWorkoutMin),
    windowDays,
    bodyKg,
    daysCounted,
  }

  return { targets, breakdown }
}
