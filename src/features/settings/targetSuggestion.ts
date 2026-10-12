import type { Settings } from '@/types'

export type GoalType = NonNullable<Settings['goalType']>
export type Sex = NonNullable<Settings['sex']>

/** What a body burns at rest (Mifflin-St Jeor; age is taken as 30, since the app doesn't ask for one). */
export function restingKcal(weightKg: number, heightCm: number, sex: Sex): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * 30 + (sex === 'male' ? 5 : -161)
}

/**
 * Maintenance calories from the formula: resting × an activity factor. When step calories are
 * subtracted, walking is counted day by day, so the target only covers resting, training and
 * daily life: "lightly active" (×1.375) instead of "moderately active" (×1.55), or walking
 * would count twice.
 */
export function formulaMaintenance(weightKg: number, heightCm: number, sex: Sex, stepsCounted: boolean): number {
  return Math.round(restingKcal(weightKg, heightCm, sex) * (stepsCounted ? 1.375 : 1.55))
}

/**
 * A logged estimate under this share of resting is taken as an incomplete food log, not a
 * metabolism: nobody up and about burns less than a body lying still.
 */
export const LOWEST_BELIEVABLE = 1.1

/** Daily targets for a goal, from a maintenance figure (the formula's, or one measured from the logs). */
export function suggestedTargets(weightKg: number, goal: GoalType, maintenance: number) {
  const offsets: Record<GoalType, number> = { cut: -500, maintain: 0, bulk: 300 }
  const proteinPer: Record<GoalType, number> = { cut: 2.2, maintain: 1.8, bulk: 1.6 }
  const fatPer: Record<GoalType, number> = { cut: 0.8, maintain: 1.0, bulk: 1.0 }
  const dailyKcal = Math.round(maintenance + offsets[goal])
  const dailyProtein = Math.round(proteinPer[goal] * weightKg)
  const dailyFat = Math.round(fatPer[goal] * weightKg)
  const dailyCarbs = Math.round(Math.max(0, dailyKcal - dailyProtein * 4 - dailyFat * 9) / 4)
  return { dailyKcal, dailyProtein, dailyCarbs, dailyFat }
}
