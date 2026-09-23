/**
 * Cardio is logged as one entry per exercise (time, optional distance, effort),
 * not as sets. Calories use MET values from the Compendium of Physical
 * Activities: by speed when a distance is logged (running, walking, cycling,
 * rowing, swimming), otherwise by the chosen effort. Always an estimate.
 */

export type Intensity = 'easy' | 'moderate' | 'hard'

/** Effort is stored in the synced `rpe` column (1–10). */
export const INTENSITIES: { value: Intensity; label: string; rpe: number }[] = [
  { value: 'easy', label: 'Easy', rpe: 3 },
  { value: 'moderate', label: 'Moderate', rpe: 5 },
  { value: 'hard', label: 'Hard', rpe: 8 },
]

export function intensityFromRpe(rpe: number | undefined): Intensity {
  if (!rpe) return 'moderate'
  return rpe <= 4 ? 'easy' : rpe <= 6 ? 'moderate' : 'hard'
}

export function rpeFor(intensity: Intensity): number {
  return INTENSITIES.find(i => i.value === intensity)?.rpe ?? 5
}

type SpeedCurve = readonly (readonly [kmh: number, met: number])[]
export type PaceStyle = 'per-km' | 'kmh' | 'per-500m' | 'per-100m'

interface CardioProfile {
  /** MET at easy / moderate / hard effort. */
  met: readonly [number, number, number]
  /** When a distance is logged, MET follows speed instead. */
  speed?: SpeedCurve
  /** Show the distance field (default true). */
  distance?: boolean
  /** How speed is shown; also enables pace bests. */
  pace?: PaceStyle
}

const RUN: SpeedCurve = [[6.4, 6.0], [8, 8.3], [9.7, 9.8], [10.8, 10.5], [12.1, 11.8], [13.8, 12.3], [14.5, 12.8], [16.1, 14.5], [17.7, 16], [19.3, 19], [22.5, 23]]
const WALK: SpeedCurve = [[3.2, 2.8], [4, 3.0], [4.8, 3.5], [5.6, 4.3], [6.4, 5.0], [7.2, 7.0], [8, 8.3]]
const BIKE: SpeedCurve = [[12, 3.5], [16, 5.8], [19, 6.8], [22, 8.0], [25.5, 10.0], [30.5, 12.0], [35, 15.8]]
// Rowing: 3:15 → 2:00 per 500 m (≈ 50 → 200 W).
const ROW: SpeedCurve = [[9.2, 3.5], [10.6, 5.0], [12, 7.0], [13.6, 8.5], [15, 12.0]]
const SWIM: SpeedCurve = [[1.5, 5.8], [2.4, 8.3], [3, 9.8], [3.6, 10.0]]

const PROFILES: Record<string, CardioProfile> = {
  'ex-running':          { met: [8.3, 9.8, 11.8], speed: RUN, pace: 'per-km' },
  'ex-treadmill-run':    { met: [8.3, 9.8, 11.8], speed: RUN, pace: 'per-km' },
  'ex-treadmill-walk':   { met: [3.0, 3.5, 5.0], speed: WALK, pace: 'per-km' },
  'ex-walking':          { met: [3.0, 3.5, 5.0], speed: WALK, pace: 'per-km' },
  'ex-incline-walk':     { met: [5.0, 6.5, 8.0], pace: 'per-km' },
  'ex-hiking':           { met: [5.3, 6.0, 7.8], pace: 'per-km' },
  'ex-sprint-intervals': { met: [8.0, 10.0, 12.0], distance: false },
  'ex-cycling':          { met: [4.0, 6.8, 10.0], speed: BIKE, pace: 'kmh' },
  'ex-stationary-bike':  { met: [3.5, 6.8, 8.8], pace: 'kmh' },
  'ex-spin-class':       { met: [6.8, 8.5, 11.0], distance: false },
  'ex-assault-bike':     { met: [6.0, 9.0, 12.0] },
  'ex-rowing-machine':   { met: [4.8, 7.0, 8.5], speed: ROW, pace: 'per-500m' },
  'ex-ski-erg':          { met: [5.0, 7.0, 9.5], pace: 'per-500m' },
  'ex-swimming':         { met: [5.8, 8.3, 9.8], speed: SWIM, pace: 'per-100m' },
  'ex-elliptical':       { met: [4.0, 5.0, 7.0] },
  'ex-stair-climber':    { met: [6.0, 9.0, 11.0], distance: false },
  'ex-jump-rope':        { met: [8.8, 11.8, 12.3], distance: false },
  'ex-battle-ropes':     { met: [6.0, 8.0, 10.3], distance: false },
  'ex-boxing':           { met: [5.5, 7.8, 12.8], distance: false },
  'ex-dancing':          { met: [4.5, 5.5, 7.3], distance: false },
  'ex-hiit':             { met: [6.0, 8.0, 10.0], distance: false },
  'ex-sled-push':        { met: [6.0, 8.0, 10.0] },
  'ex-basketball':       { met: [6.0, 6.5, 8.0], distance: false },
  'ex-soccer':           { met: [5.0, 7.0, 10.0] },
  'ex-badminton':        { met: [4.5, 5.5, 7.0], distance: false },
  'ex-tennis':           { met: [5.0, 7.3, 8.0], distance: false },
  'ex-pickleball':       { met: [4.1, 5.0, 6.0], distance: false },
  'ex-yoga':             { met: [2.5, 3.0, 4.0], distance: false },
  'ex-pilates':          { met: [2.8, 3.0, 4.0], distance: false },
  'ex-stretching':       { met: [2.3, 2.5, 3.0], distance: false },
}
const DEFAULT_PROFILE: CardioProfile = { met: [4.0, 7.0, 10.0] }

function profile(exerciseId: string): CardioProfile {
  return PROFILES[exerciseId] ?? DEFAULT_PROFILE
}

export function showsDistance(exerciseId: string): boolean {
  return profile(exerciseId).distance ?? true
}

export function paceStyle(exerciseId: string): PaceStyle | undefined {
  return profile(exerciseId).pace
}

function interpolate(curve: SpeedCurve, x: number): number {
  const [x0, y0] = curve[0]
  if (x <= x0) return Math.max(2, (y0 * x) / x0) // slower than the table: scale down, but never below light activity
  for (let i = 1; i < curve.length; i++) {
    const [a, ya] = curve[i - 1]
    const [b, yb] = curve[i]
    if (x <= b) return ya + ((yb - ya) * (x - a)) / (b - a)
  }
  return curve[curve.length - 1][1]
}

export interface CardioEntry {
  duration?: number // minutes
  distanceKm?: number
  rpe?: number
}

export function speedKmh(e: CardioEntry): number | null {
  return e.duration && e.distanceKm ? e.distanceKm / (e.duration / 60) : null
}

export function cardioMet(exerciseId: string, e: CardioEntry): number {
  const p = profile(exerciseId)
  const speed = speedKmh(e)
  if (p.speed && speed) return interpolate(p.speed, speed)
  const idx = INTENSITIES.findIndex(i => i.value === intensityFromRpe(e.rpe))
  return p.met[Math.max(0, idx)]
}

/** kcal for one entry; `bodyKg` must already be resolved (see resolveBodyKg in workoutMath). */
export function cardioKcal(exerciseId: string, e: CardioEntry, bodyKg: number): number {
  return e.duration ? cardioMet(exerciseId, e) * bodyKg * (e.duration / 60) : 0
}

function clock(minutes: number): string {
  const total = Math.round(minutes * 60)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/** "5:30 /km", "22.4 km/h", "2:05 /500m" — null without both time and distance. */
export function formatPace(exerciseId: string, e: CardioEntry): string | null {
  const speed = speedKmh(e)
  return speed ? formatSpeed(exerciseId, speed) : null
}

export function formatSpeed(exerciseId: string, speed: number): string {
  switch (paceStyle(exerciseId) ?? 'per-km') {
    case 'kmh': return `${speed.toFixed(1)} km/h`
    case 'per-500m': return `${clock(30 / speed)} /500m`
    case 'per-100m': return `${clock(6 / speed)} /100m`
    case 'per-km': return `${clock(60 / speed)} /km`
  }
}

export function formatKm(km: number): string {
  return `${Math.round(km * 100) / 100} km`
}
