import type { Targets } from '@/types'

export interface EffectiveTargets {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

const DEFAULTS: EffectiveTargets = { kcal: 2000, protein: 150, carbs: 200, fat: 65 }

/** The day's place in the plan: whether a workout is planned (and not skipped), and how many days a week are. */
export interface DayPlan {
  training: boolean
  perWeek: number
}

/**
 * A day's targets. Calories stay at the baseline, since step calories come off what
 * you ate instead (`lib/stepCalories.ts`). Carbs and fat grow by what the steps
 * burned, in the baseline carb:fat ratio, so eating that energy back still lands
 * on target. Protein stays where the user set it.
 *
 * With a `plan` (Profile → Daily targets, on unless switched off), a planned workout day
 * takes carbs in place of some fat, and rest days give it back: every day keeps its calories
 * and the week its carbs and fat. The amount moved is a fifth of the carbs at most, no more
 * than leaves fat at 15% of the calories on a workout day or rest days under 70% of their carbs
 * (with most of the week training, the few rest days would otherwise turn mostly to fat).
 */
export function targetsForDay(baseline: Targets | undefined, stepKcal: number, plan?: DayPlan): EffectiveTargets {
  if (!baseline) return DEFAULTS
  const carbKcal = baseline.dailyCarbs * 4
  const fatKcal = baseline.dailyFat * 9
  const carbShare = carbKcal + fatKcal > 0 ? carbKcal / (carbKcal + fatKcal) : 0.6
  let carbs = baseline.dailyCarbs + (stepKcal * carbShare) / 4
  let fat = baseline.dailyFat + (stepKcal * (1 - carbShare)) / 9
  if (plan && plan.perWeek > 0 && plan.perWeek < 7) {
    const restDays = 7 - plan.perWeek
    const fatRoom = (Math.max(0, baseline.dailyFat - (0.15 * baseline.dailyKcal) / 9) * 9) / 4
    const shift = Math.min(baseline.dailyCarbs * 0.2, fatRoom, (baseline.dailyCarbs * 0.3 * restDays) / plan.perWeek)
    const moved = plan.training ? shift : -(shift * plan.perWeek) / restDays
    carbs += moved
    fat -= (moved * 4) / 9
  }
  return { kcal: baseline.dailyKcal, protein: baseline.dailyProtein, carbs: Math.round(carbs), fat: Math.round(fat) }
}
