import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { Settings, Targets } from '@/types'

export type GoalType = NonNullable<Settings['goalType']>
export type Sex = NonNullable<Settings['sex']>
export type TargetValues = Omit<Targets, 'id' | 'updatedAt' | 'syncPending'>

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

/** The cut paces offered, in % of body weight a week (Helms et al. 2014: 0.5–1%; slower keeps more muscle). */
export const CUT_PACES = [0.25, 0.5, 0.75] as const
const KCAL_PER_KG = 7700

/**
 * How fast the goal moves the body, in % of its weight a week (negative = losing): a cut at the
 * pace chosen (0.5 unless set), a bulk at 0.25%, or 0.5% in the first year of lifting, when a
 * surplus builds the most muscle (Iraki et al. 2019: 0.25–0.5% for novice and intermediate).
 */
export function goalPace(goal: GoalType, cutPace: number | undefined, trainingSince: string | undefined, today: string): number {
  if (goal === 'cut') return -(cutPace ?? 0.5)
  if (goal === 'maintain') return 0
  const firstYear = !!trainingSince && differenceInCalendarDays(parseISO(today), parseISO(trainingSince)) < 365
  return firstYear ? 0.5 : 0.25
}

/**
 * Macros for a day of `kcal`: protein 1.8 g per kg, 2.2 on a cut (Morton et al. 2018: gains level
 * off around 1.6, up to 2.2; more helps in a deficit), fat 0.8 g per kg and at least a fifth of
 * the calories, carbs the rest. Per kg of a weight capped at a BMI of 27 when the height is known,
 * so a heavy body isn't asked for 300 g of protein.
 */
export function macrosFor(kcal: number, weightKg: number, goal: GoalType, heightCm?: number): TargetValues {
  const ref = heightCm ? Math.min(weightKg, 27 * (heightCm / 100) ** 2) : weightKg
  const dailyProtein = Math.round((goal === 'cut' ? 2.2 : 1.8) * ref)
  const dailyFat = Math.round(Math.max(0.8 * ref, (0.2 * kcal) / 9))
  const dailyCarbs = Math.round(Math.max(0, kcal - dailyProtein * 4 - dailyFat * 9) / 4)
  return { dailyKcal: kcal, dailyProtein, dailyCarbs, dailyFat }
}

/** Daily targets for a goal, from a maintenance figure (the formula's, or one measured from the logs), at `pace` % a week. */
export function suggestedTargets(weightKg: number, goal: GoalType, maintenance: number, pace: number, heightCm?: number): TargetValues {
  const kcal = Math.round((maintenance + ((pace / 100) * weightKg * KCAL_PER_KG) / 7) / 10) * 10
  return macrosFor(kcal, weightKg, goal, heightCm)
}
