import { MAX_RATING } from './tiers'
import { REFERENCE_BODY_KG, type Sex, type Standard } from './standards'

type Five = readonly [number, number, number, number, number]

// How each level's threshold grows with bodyweight, fitted to the source tables:
// strength grows slower than bodyweight, and more so at the elite end.
const LOAD_EXPONENT: Record<Sex, Five> = {
  male: [1.27, 1.09, 0.95, 0.84, 0.76],
  female: [1.05, 0.85, 0.69, 0.6, 0.52],
}
// Heavier lifters manage fewer bodyweight reps.
const REPS_EXPONENT: Record<Sex, number> = { male: 0.75, female: 1.1 }

/** Ratings at the five reference levels (beginner → elite). Olympian (900+) lies beyond elite. */
const LEVEL_RATINGS: Five = [150, 300, 450, 650, 850]
/** Bodyweight moves rate from ~30% of bodyweight (heavily assisted); load lifts from 0 kg. */
const REPS_FLOOR = -21
/** Epley reps cap: past this a set measures endurance more than strength. */
const MAX_REPS = 20

export interface RatableSet {
  weight?: number
  reps?: number
}

/** The five level thresholds at this lifter's bodyweight, in the standard's unit. */
export function thresholdsFor(std: Standard, sex: Sex, bodyKg: number): number[] {
  const ratio = Math.min(180, Math.max(35, bodyKg)) / REFERENCE_BODY_KG[sex]
  const levels = std[sex]
  if (std.kind === 'load') return levels.map((v, i) => v * Math.pow(ratio, LOAD_EXPONENT[sex][i]))
  const f = ratio > 1 ? Math.pow(1 / ratio, REPS_EXPONENT[sex]) : 1
  return levels.map(v => (v > 0 ? v * f : v))
}

/**
 * A set's strength in the standard's unit: estimated 1RM (kg) for load lifts,
 * bodyweight-equivalent reps for bodyweight moves (added weight → extra reps,
 * assistance → fewer). Null when the set can't be rated.
 */
export function performanceOf(std: Standard, set: RatableSet, bodyKg: number): number | null {
  const reps = set.reps ?? 0
  const weight = set.weight ?? 0
  if (reps <= 0) return null
  if (std.kind === 'load') {
    if (weight <= 0) return null
    return reps === 1 ? weight : weight * (1 + Math.min(reps, MAX_REPS) / 30)
  }
  if (std.assisted && weight <= 0) return null // assistance unknown
  const base = bodyKg * std.bodyShare
  const moved = std.assisted ? base - weight : base + weight
  if (moved <= 0) return null
  return 30 * ((moved * (1 + Math.min(reps, 100) / 30)) / base - 1)
}

function curve(std: Standard, t: number[]): [number, number][] {
  const floor = std.kind === 'load' ? 0 : REPS_FLOOR
  return [
    [floor, 0],
    ...t.map((v, i): [number, number] => [v, LEVEL_RATINGS[i]]),
    [t[4] + (t[4] - t[3]), MAX_RATING], // past elite, keep the advanced→elite pace
  ]
}

/** Piecewise-linear rating (0 = unrated, 1–1000). */
export function ratingFor(std: Standard, perf: number, t: number[]): number {
  const pts = curve(std, t)
  if (perf <= pts[0][0]) return 0
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    if (perf < x1) return Math.max(1, y0 + ((y1 - y0) * (perf - x0)) / (x1 - x0))
  }
  return MAX_RATING
}

/** Inverse of ratingFor: the performance needed to reach a rating. */
export function performanceFor(std: Standard, rating: number, t: number[]): number {
  const pts = curve(std, t)
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    if (rating <= y1) return x0 + ((x1 - x0) * (rating - y0)) / (y1 - y0)
  }
  return pts[pts.length - 1][0]
}

export function rateSet(std: Standard, set: RatableSet, sex: Sex, bodyKg: number): number {
  const perf = performanceOf(std, set, bodyKg)
  return perf == null ? 0 : ratingFor(std, perf, thresholdsFor(std, sex, bodyKg))
}

/** Bodyweight on a date: the latest weigh-in on/before it, else the first one after. */
export function bodyweightLookup(entries: { date: string; weightKg: number }[]): (date: string) => number | undefined {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  return date => {
    let found: number | undefined
    for (const e of sorted) {
      if (e.date > date) return found ?? e.weightKg
      found = e.weightKg
    }
    return found
  }
}
