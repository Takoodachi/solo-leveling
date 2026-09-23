import type { Exercise, TrainingLevel, VolumeMuscle } from '@/types'

/**
 * Weekly set volume per muscle against volume landmarks (Renaissance
 * Periodization, Israetel et al.): MEV = minimum effective volume, MAV =
 * maximum adaptive volume (the sweet spot), MRV = maximum recoverable volume.
 * Values are hard sets per week for an intermediate lifter; other levels scale.
 */

export type { TrainingLevel, VolumeMuscle }
export type VolumeStatus = 'below' | 'growing' | 'sweet' | 'over'

interface Landmarks {
  key: VolumeMuscle
  label: string
  /** Radar label, when `label` is too long. */
  short?: string
  mev: readonly [number, number]
  mav: readonly [number, number]
  mrv: number
  /** Not in RP's tables: a conservative estimate. */
  estimate?: boolean
}

/** In radar order: pushing muscles, arms, core, legs, then back, so the shape reads upper vs lower body. */
export const VOLUME_MUSCLES: readonly Landmarks[] = [
  { key: 'chest', label: 'Chest', mev: [10, 10], mav: [12, 20], mrv: 22 },
  { key: 'shoulders', label: 'Shoulders', mev: [6, 8], mav: [12, 20], mrv: 26 },
  { key: 'triceps', label: 'Triceps', mev: [4, 6], mav: [8, 14], mrv: 18 },
  { key: 'biceps', label: 'Biceps', mev: [6, 6], mav: [10, 16], mrv: 20 },
  { key: 'forearms', label: 'Forearms', mev: [2, 4], mav: [6, 12], mrv: 18, estimate: true },
  { key: 'abs', label: 'Abdominals', mev: [0, 4], mav: [10, 16], mrv: 25 },
  { key: 'quads', label: 'Quadriceps', mev: [8, 8], mav: [12, 18], mrv: 20 },
  { key: 'adductors', label: 'Adductors', mev: [0, 4], mav: [4, 10], mrv: 16, estimate: true },
  { key: 'abductors', label: 'Abductors', mev: [0, 4], mav: [4, 10], mrv: 16, estimate: true },
  { key: 'glutes', label: 'Glutes', mev: [0, 4], mav: [4, 12], mrv: 16 },
  { key: 'hamstrings', label: 'Hamstrings', mev: [6, 6], mav: [10, 16], mrv: 20 },
  { key: 'calves', label: 'Calves', mev: [6, 6], mav: [8, 16], mrv: 20 },
  { key: 'lower-back', label: 'Lower back', short: 'Low back', mev: [0, 4], mav: [4, 10], mrv: 14, estimate: true },
  { key: 'traps', label: 'Traps', mev: [0, 4], mav: [12, 20], mrv: 26 },
  { key: 'lats', label: 'Lats / Mid back', short: 'Lats', mev: [10, 12], mav: [14, 22], mrv: 25 },
]

export const DEFAULT_RADAR: readonly VolumeMuscle[] = [
  'chest', 'shoulders', 'triceps', 'biceps', 'abs', 'quads', 'adductors', 'abductors', 'glutes', 'hamstrings', 'calves', 'lats',
]
export const MIN_RADAR_MUSCLES = 3

export const TRAINING_LEVELS: { value: TrainingLevel; label: string; blurb: string; scale: number }[] = [
  { value: 'beginner', label: 'Beginner', blurb: 'Under 1 year: less volume already drives growth', scale: 0.75 },
  { value: 'intermediate', label: 'Intermediate', blurb: '1–3 years: moderate volume for continued progress', scale: 1 },
  { value: 'advanced', label: 'Advanced', blurb: '3+ years: more volume needed to keep growing', scale: 1.25 },
]

/** General ranges by training level (sets / week), shown in the guidelines. */
export const LEVEL_GUIDE = [
  { label: 'Beginner', mev: '6–8', mav: '10–12', mrv: '12–16' },
  { label: 'Intermediate', mev: '10–12', mav: '12–18', mrv: '18–22' },
  { label: 'Advanced', mev: '12–14', mav: '18–20+', mrv: '22–28' },
] as const

export const STATUS: Record<VolumeStatus, { label: string; color: string }> = {
  below: { label: 'Below MEV', color: '#facc15' },
  growing: { label: 'Growing', color: '#fb923c' },
  sweet: { label: 'Sweet spot', color: '#4ade80' },
  over: { label: 'Overreaching', color: '#f472b6' },
}

export interface Thresholds {
  /** Below this is below MEV (the middle of the MEV range). */
  mev: number
  mavLow: number
  mavHigh: number
  mrv: number
}

export function landmarksOf(key: VolumeMuscle): Landmarks {
  return VOLUME_MUSCLES.find(m => m.key === key)!
}

export function thresholdsFor(key: VolumeMuscle, level: TrainingLevel): Thresholds {
  const m = landmarksOf(key)
  const k = TRAINING_LEVELS.find(l => l.value === level)?.scale ?? 1
  const r = (v: number) => Math.round(v * k)
  return { mev: r((m.mev[0] + m.mev[1]) / 2), mavLow: r(m.mav[0]), mavHigh: r(m.mav[1]), mrv: r(m.mrv) }
}

export function statusOf(sets: number, t: Thresholds): VolumeStatus {
  if (sets < t.mev) return 'below'
  if (sets < t.mavLow) return 'growing'
  return sets <= t.mavHigh ? 'sweet' : 'over'
}

export const formatSets = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

export function formatRange([lo, hi]: readonly [number, number]): string {
  return lo === hi ? String(lo) : `${lo}–${hi}`
}

// ── Exercise → muscles ─────────────────────────────────────────────────────────

/** Muscle names used in the exercise data. Unlisted names (Core, Hip Flexors…) don't count. */
const NAME_TO_MUSCLE: Record<string, VolumeMuscle> = {
  Chest: 'chest', 'Upper Chest': 'chest', 'Lower Chest': 'chest',
  'Anterior Deltoid': 'shoulders', 'Lateral Deltoid': 'shoulders', 'Rear Deltoid': 'shoulders', Shoulders: 'shoulders', 'Rotator Cuff': 'shoulders',
  Triceps: 'triceps', Biceps: 'biceps', Brachialis: 'biceps', Forearms: 'forearms',
  Abs: 'abs', Obliques: 'abs', 'Transverse Abdominis': 'abs',
  Quadriceps: 'quads', Hamstrings: 'hamstrings', Glutes: 'glutes', Calves: 'calves',
  Adductors: 'adductors', Abductors: 'abductors',
  Lats: 'lats', Rhomboids: 'lats', 'Middle Back': 'lats', 'Upper Back': 'lats', Back: 'lats',
  Traps: 'traps', 'Lower Back': 'lower-back',
}

/** Custom exercises carry only a category. */
const CATEGORY_TO_MUSCLE: Record<string, VolumeMuscle> = {
  Chest: 'chest', Back: 'lats', Shoulders: 'shoulders', 'Lower Body': 'quads', Core: 'abs',
}

/**
 * Sets each muscle gets from one set of this exercise: 1 for a primary muscle,
 * ½ for a secondary one. "Core" counts as abs only when it's the target, and
 * front delts only when they're the target. Cardio and stretching count for nothing.
 */
export function muscleShares(ex: Exercise): Map<VolumeMuscle, number> {
  const shares = new Map<VolumeMuscle, number>()
  if (ex.type === 'cardio' || ex.type === 'flexibility') return shares
  const add = (name: string, share: number) => {
    const m = NAME_TO_MUSCLE[name]
    if (m) shares.set(m, Math.max(shares.get(m) ?? 0, share))
  }
  // Pressing always lists the front delts; RP's shoulder ranges are for side and rear delts, so skip them as a helper.
  ex.musclesSecondary?.forEach(n => n !== 'Anterior Deltoid' && add(n, 0.5))
  ex.muscles?.forEach(n => add(n === 'Core' ? 'Abs' : n, 1))
  if (!ex.muscles?.length && CATEGORY_TO_MUSCLE[ex.category]) shares.set(CATEGORY_TO_MUSCLE[ex.category], 1)
  return shares
}
