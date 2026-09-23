import { rankFor, type RankInfo } from './tiers'
import type { Sex } from './standards'
import { curvePerformance, curveRating } from './scoring'

/**
 * Running rank: every run of 5 km or more is converted to the 5K time it's
 * worth (Riegel's formula, T₂ = T₁ × (D₂/D₁)^1.06) and rated against 5K
 * standards. Holding a pace for longer is worth more, so a 10K at 5:20 /km
 * ranks like a 5K at 5:07 /km. Only the average pace is known (no splits).
 */

export const RUN_EXERCISE_IDS = ['ex-running', 'ex-treadmill-run'] as const
/** Shortest run that ranks (a little slack for GPS rounding). */
export const MIN_RUN_KM = 4.95
const RIEGEL = 1.06
/** Faster than this (km/h, as a 5K) is a typo, not a run. */
const MAX_PLAUSIBLE_KMH = 24

type Five = readonly [number, number, number, number, number]
// 5K finish times in minutes at beginner → elite (faster than 5 / 20 / 50 / 80 / 95% of
// runners), ages 20–30, from Running Level's 5K standards. Rated as speed, so the
// scale is even in km/h.
const FIVE_K_MIN: Record<Sex, Five> = {
  male: [31.48, 26.32, 22.52, 19.73, 17.67],
  female: [35.45, 30.13, 26.12, 23.07, 20.78],
}

const speedFor5k = (minutes: number) => 300 / minutes // km/h
const thresholds = (sex: Sex) => FIVE_K_MIN[sex].map(speedFor5k)

export function isRunExercise(exerciseId: string): boolean {
  return (RUN_EXERCISE_IDS as readonly string[]).includes(exerciseId)
}

/** The 5K time (minutes) a run is worth, or null if it's too short to rank. */
export function equivalent5k(distanceKm: number | undefined, minutes: number | undefined): number | null {
  if (!distanceKm || !minutes || distanceKm < MIN_RUN_KM) return null
  const t = minutes * Math.pow(5 / distanceKm, RIEGEL)
  return speedFor5k(t) > MAX_PLAUSIBLE_KMH ? null : t
}

/** 1–1000, or 0 when the run doesn't rank. */
export function rateRun(sex: Sex, distanceKm: number | undefined, minutes: number | undefined): number {
  const t = equivalent5k(distanceKm, minutes)
  return t == null ? 0 : curveRating(speedFor5k(t), thresholds(sex))
}

/** 5K time (minutes) needed for a rating. */
export function fiveKTimeFor(sex: Sex, rating: number): number {
  return 300 / curvePerformance(rating, thresholds(sex))
}

/** Same effort over another distance (Riegel). */
export function timeOver(distanceKm: number, fiveKMinutes: number): number {
  return fiveKMinutes * Math.pow(distanceKm / 5, RIEGEL)
}

/** "24:05" or "1:02:10". */
export function formatRunTime(minutes: number): string {
  const total = Math.round(minutes * 60)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
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
