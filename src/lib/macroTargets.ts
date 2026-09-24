import type { Targets } from '@/types'

export interface EffectiveTargets {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

const DEFAULTS: EffectiveTargets = { kcal: 2000, protein: 150, carbs: 200, fat: 65 }

/**
 * A day's targets. Calories stay at the baseline, since step calories come off what
 * you ate instead (`lib/stepCalories.ts`). Carbs and fat grow by what the steps
 * burned, in the baseline carb:fat ratio, so eating that energy back still lands
 * on target. Protein stays where the user set it.
 */
export function targetsForDay(baseline: Targets | undefined, stepKcal: number): EffectiveTargets {
  if (!baseline) return DEFAULTS
  const carbKcal = baseline.dailyCarbs * 4
  const fatKcal = baseline.dailyFat * 9
  const carbShare = carbKcal + fatKcal > 0 ? carbKcal / (carbKcal + fatKcal) : 0.6
  return {
    kcal: baseline.dailyKcal,
    protein: baseline.dailyProtein,
    carbs: Math.round(baseline.dailyCarbs + (stepKcal * carbShare) / 4),
    fat: Math.round(baseline.dailyFat + (stepKcal * (1 - carbShare)) / 9),
  }
}
