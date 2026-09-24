import { MAX_RATING, rankFor, type RankInfo } from './tiers'
import type { MuscleRegion, Sex } from './standards'
import { curvePerformance, curveRating, type Five } from './scoring'

/**
 * Running score (1–1000) for every run of 5 km or more:
 *
 * 1. Pace: the run becomes the 5K time it's worth (Riegel, T₂ = T₁ × (D₂/D₁)^1.06),
 *    rated on a scale for active adults rather than competitive runners.
 * 2. Distance: holding that pace for longer adds a bonus (+90 per doubling of the
 *    distance beyond 5 km: 10K +90, half marathon +187, marathon +250).
 *
 * Calibrated so a 6:00 /km half marathon is Diamond and outstanding runs
 * (sub-1:30 half, sub-3:30 marathon, a 5K around 17:15) reach Olympian. The same
 * score is the running rank and ranks the legs (LEG_CREDIT). Only the average
 * pace is known (no splits).
 */

export const RUN_EXERCISE_IDS = ['ex-running', 'ex-treadmill-run'] as const
/** Shortest run that ranks (a little slack for GPS rounding). */
export const MIN_RUN_KM = 4.95
const RIEGEL = 1.06
/** Slower than ≈ 8:30 /km is walking; faster than 24 km/h (as a 5K) is a typo. */
const MIN_RUN_KMH = 7
const MAX_PLAUSIBLE_KMH = 24
const BONUS_PER_DOUBLING = 90
const MAX_BONUS = 250

// 5K times (minutes) at the five reference levels, for active adults (women's
// times are ≈ 13% slower). Rated as speed. Running keeps its own level ratings,
// calibrated with the distance bonus (a 6:00 /km half marathon = Diamond).
const RUN_LEVELS: Five = [150, 300, 450, 650, 850]
const FIVE_K_MIN: Record<Sex, Five> = {
  male: [44, 34, 27.5, 22, 18.25],
  female: [50, 38.5, 31, 25, 20.67],
}

/**
 * Running also trains the legs, as endurance rather than maximal strength, so
 * the running score counts fully for calves and a little less for the muscles
 * running loads less. Lifts still count when they rank a muscle higher.
 */
export const LEG_CREDIT: Partial<Record<MuscleRegion, number>> = { calves: 1, quads: 0.95, hamstrings: 0.85, glutes: 0.8 }

const speedFor5k = (minutes: number) => 300 / minutes // km/h
const thresholds = (sex: Sex) => FIVE_K_MIN[sex].map(speedFor5k)

export function isRunExercise(exerciseId: string): boolean {
  return (RUN_EXERCISE_IDS as readonly string[]).includes(exerciseId)
}

/** Points for distance: 0 up to 5 km, +90 per doubling, capped at +250 (marathon). */
export function distanceBonus(distanceKm: number): number {
  return distanceKm <= 5 ? 0 : Math.min(MAX_BONUS, BONUS_PER_DOUBLING * Math.log2(distanceKm / 5))
}

/** The 5K time (minutes) a run's pace is worth, or null if it doesn't rank (too short, walking pace, or a typo). */
export function equivalent5k(distanceKm: number | undefined, minutes: number | undefined): number | null {
  if (!distanceKm || !minutes || distanceKm < MIN_RUN_KM || distanceKm / (minutes / 60) < MIN_RUN_KMH) return null
  const t = minutes * Math.pow(5 / distanceKm, RIEGEL)
  return speedFor5k(t) > MAX_PLAUSIBLE_KMH ? null : t
}

/** 1–1000, or 0 when the run doesn't rank. */
export function rateRun(sex: Sex, distanceKm: number | undefined, minutes: number | undefined): number {
  const t = equivalent5k(distanceKm, minutes)
  if (t == null) return 0
  return Math.min(MAX_RATING, curveRating(speedFor5k(t), thresholds(sex), 0, RUN_LEVELS) + distanceBonus(distanceKm!))
}

/** 5K time (minutes) needed for a rating. */
export function fiveKTimeFor(sex: Sex, rating: number): number {
  return timeFor(sex, rating, 5)
}

/**
 * Time (minutes) over `distanceKm` that scores `rating`, counting that distance's
 * bonus. Never slower than running pace: when the bonus alone covers the rating,
 * finishing at a run is enough.
 */
export function timeFor(sex: Sex, rating: number, distanceKm: number): number {
  const pace = Math.max(1, rating - distanceBonus(distanceKm))
  const t = (300 / curvePerformance(pace, thresholds(sex), 0, RUN_LEVELS)) * Math.pow(distanceKm / 5, RIEGEL)
  return Math.min(t, (distanceKm / MIN_RUN_KMH) * 60)
}

/** "24:05" or "1:02:10". */
export function formatRunTime(minutes: number): string {
  const total = Math.round(minutes * 60)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

/** "A 23:01 5K", or for longer runs "Pace like a 27:31 5K, +187 for 21.1 km". */
export function describeRunScore(distanceKm: number, minutes: number): string | null {
  const t = equivalent5k(distanceKm, minutes)
  if (t == null) return null
  const bonus = Math.round(distanceBonus(distanceKm))
  return bonus > 0 ? `Pace like a ${formatRunTime(t)} 5K, +${bonus} for ${Math.round(distanceKm * 10) / 10} km` : `A ${formatRunTime(t)} 5K`
}

export interface RunRank {
  rank: RankInfo
  best: { distanceKm: number; duration: number; date: string; equivalent5k: number }
}

/** The running rank including a run being logged now; null when neither ranks. */
export function liveRunRank(sex: Sex, run: { distanceKm?: number; duration?: number }, historical: RankInfo | undefined): RankInfo | undefined {
  const rating = Math.max(historical?.rating ?? 0, rateRun(sex, run.distanceKm, run.duration))
  return rating > 0 ? rankFor(rating) : undefined
}
