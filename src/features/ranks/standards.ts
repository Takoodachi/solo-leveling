/**
 * Strength standards behind the rank ladder.
 *
 * Each ranked lift has five reference levels (≈ 5th / 20th / 50th / 80th / 95th
 * percentile of gym lifters, i.e. beginner → elite), taken from public
 * bodyweight-indexed strength standards and rounded. Values are quoted at a
 * reference bodyweight (men 80 kg, women 60 kg) and scaled to the lifter's own
 * bodyweight in `scoring.ts`.
 *
 * - `load` lifts: estimated 1RM in kg. Dumbbell lifts use ONE dumbbell's weight.
 * - `reps` lifts (bodyweight moves): reps at bodyweight. Negative = can't do one
 *   yet (you'd need that many "reps of assistance").
 *
 * Lifts without their own data borrow a close relative's standard × a factor.
 */

export type Sex = 'male' | 'female'
export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs'

type Levels = readonly [number, number, number, number, number]

export interface LoadStandard { kind: 'load'; group: MuscleGroup; male: Levels; female: Levels }
export interface RepsStandard {
  kind: 'reps'
  group: MuscleGroup
  male: Levels
  female: Levels
  /** Share of bodyweight actually moved (push-ups move ~65%). */
  bodyShare: number
  /** The kg column is assistance (machine/band), not added weight. */
  assisted?: boolean
}
export type Standard = LoadStandard | RepsStandard

interface Derived { like: string; factor: number; group?: MuscleGroup }

export const REFERENCE_BODY_KG: Record<Sex, number> = { male: 80, female: 60 }

export const MUSCLE_GROUPS: { key: MuscleGroup; label: string; weight: number }[] = [
  { key: 'chest',     label: 'Chest',     weight: 0.2 },
  { key: 'back',      label: 'Back',      weight: 0.25 },
  { key: 'shoulders', label: 'Shoulders', weight: 0.15 },
  { key: 'arms',      label: 'Arms',      weight: 0.15 },
  { key: 'legs',      label: 'Legs',      weight: 0.25 },
]

const load = (group: MuscleGroup, male: Levels, female: Levels): LoadStandard => ({ kind: 'load', group, male, female })

const BENCH = load('chest', [56, 75, 98, 124, 151], [19, 31, 47, 66, 88])
const SQUAT = load('legs', [75, 101, 132, 168, 206], [32, 49, 72, 99, 129])
const DEADLIFT = load('back', [89, 119, 155, 196, 239], [40, 60, 86, 116, 149])
const OHP = load('shoulders', [33, 46, 62, 81, 101], [12, 20, 31, 43, 57])
const ROW = load('back', [48, 66, 88, 114, 141], [18, 29, 43, 59, 78])
const PULLDOWN = load('back', [47, 64, 85, 108, 133], [23, 33, 46, 60, 76])
const DB_BENCH = load('chest', [19, 28, 40, 53, 68], [7, 12, 19, 28, 38])
const DB_CURL = load('arms', [8, 14, 22, 32, 42], [4, 7, 12, 18, 24])
const PUSHDOWN = load('arms', [22, 36, 56, 80, 107], [9, 17, 28, 42, 59])
const LATERAL = load('shoulders', [5, 10, 16, 25, 34], [3, 6, 9, 13, 17])
const LEG_PRESS = load('legs', [109, 162, 230, 309, 395], [49, 87, 140, 204, 277])
const HIP_THRUST = load('legs', [56, 96, 149, 213, 285], [35, 63, 100, 147, 199])
const LEG_EXT = load('legs', [48, 72, 103, 140, 180], [22, 38, 59, 86, 115])

const PULL_UP: RepsStandard = { kind: 'reps', group: 'back', male: [-3, 6, 13, 21, 29], female: [-9, -3, 6, 13, 21], bodyShare: 1 }
const DIP: RepsStandard = { kind: 'reps', group: 'arms', male: [4, 10, 20, 31, 42], female: [-4, 1, 9, 19, 30], bodyShare: 0.95 }
const PUSH_UP: RepsStandard = { kind: 'reps', group: 'chest', male: [6, 20, 38, 60, 83], female: [-5, 7, 18, 31, 47], bodyShare: 0.65 }

const BASE: Record<string, Standard> = {
  'ex-barbell-bench-press': BENCH,
  'ex-barbell-back-squat': SQUAT,
  'ex-conventional-deadlift': DEADLIFT,
  'ex-overhead-press': OHP,
  'ex-barbell-row': ROW,
  'ex-lat-pulldown': PULLDOWN,
  'ex-dumbbell-bench-press': DB_BENCH,
  'ex-dumbbell-curl': DB_CURL,
  'ex-tricep-pushdown': PUSHDOWN,
  'ex-lateral-raise': LATERAL,
  'ex-leg-press': LEG_PRESS,
  'ex-barbell-hip-thrust': HIP_THRUST,
  'ex-leg-extension': LEG_EXT,
  'ex-pull-up': PULL_UP,
  'ex-wide-grip-pull-up': PULL_UP,
  'ex-chin-up': PULL_UP,
  'ex-assisted-pull-up': { ...PULL_UP, assisted: true },
  'ex-dip': DIP,
  'ex-push-up': PUSH_UP,
}

// Rough ratios to the base lift (typical 1RM relationships).
const DERIVED: Record<string, Derived> = {
  // Chest
  'ex-incline-barbell-press':   { like: 'ex-barbell-bench-press', factor: 0.82 },
  'ex-decline-bench-press':     { like: 'ex-barbell-bench-press', factor: 1.02 },
  'ex-pause-bench-press':       { like: 'ex-barbell-bench-press', factor: 0.92 },
  'ex-close-grip-bench-press':  { like: 'ex-barbell-bench-press', factor: 0.88 },
  'ex-floor-press':             { like: 'ex-barbell-bench-press', factor: 0.9 },
  'ex-smith-machine-bench':     { like: 'ex-barbell-bench-press', factor: 1 },
  'ex-machine-chest-press':     { like: 'ex-barbell-bench-press', factor: 1.05 },
  'ex-incline-dumbbell-press':  { like: 'ex-dumbbell-bench-press', factor: 0.85 },
  'ex-decline-dumbbell-press':  { like: 'ex-dumbbell-bench-press', factor: 1 },
  // Back
  'ex-sumo-deadlift':           { like: 'ex-conventional-deadlift', factor: 1 },
  'ex-trap-bar-deadlift':       { like: 'ex-conventional-deadlift', factor: 1.08 },
  'ex-rack-pull':               { like: 'ex-conventional-deadlift', factor: 1.15 },
  'ex-snatch-grip-deadlift':    { like: 'ex-conventional-deadlift', factor: 0.85 },
  'ex-power-clean':             { like: 'ex-conventional-deadlift', factor: 0.55 },
  'ex-pendlay-row':             { like: 'ex-barbell-row', factor: 0.95 },
  'ex-t-bar-row':               { like: 'ex-barbell-row', factor: 1 },
  'ex-seal-row':                { like: 'ex-barbell-row', factor: 0.85 },
  'ex-dumbbell-row':            { like: 'ex-barbell-row', factor: 0.48 },
  'ex-single-arm-dumbbell-row': { like: 'ex-barbell-row', factor: 0.48 },
  'ex-chest-supported-row':     { like: 'ex-barbell-row', factor: 0.4 },
  'ex-cable-row':               { like: 'ex-lat-pulldown', factor: 1 },
  'ex-machine-row':             { like: 'ex-lat-pulldown', factor: 1 },
  'ex-wide-grip-lat-pulldown':  { like: 'ex-lat-pulldown', factor: 0.95 },
  'ex-close-grip-lat-pulldown': { like: 'ex-lat-pulldown', factor: 1 },
  'ex-reverse-grip-pulldown':   { like: 'ex-lat-pulldown', factor: 1 },
  // Shoulders
  'ex-seated-shoulder-press':   { like: 'ex-overhead-press', factor: 1 },
  'ex-push-press':              { like: 'ex-overhead-press', factor: 1.25 },
  'ex-dumbbell-shoulder-press': { like: 'ex-overhead-press', factor: 0.42 },
  'ex-arnold-press':            { like: 'ex-overhead-press', factor: 0.38 },
  // Arms
  'ex-barbell-curl':            { like: 'ex-dumbbell-curl', factor: 2.1 },
  'ex-ez-bar-curl':             { like: 'ex-dumbbell-curl', factor: 2 },
  'ex-preacher-curl':           { like: 'ex-dumbbell-curl', factor: 1.7 },
  'ex-hammer-curl':             { like: 'ex-dumbbell-curl', factor: 1.1 },
  'ex-incline-dumbbell-curl':   { like: 'ex-dumbbell-curl', factor: 0.85 },
  'ex-concentration-curl':      { like: 'ex-dumbbell-curl', factor: 0.9 },
  'ex-rope-tricep-extension':   { like: 'ex-tricep-pushdown', factor: 0.85 },
  'ex-skull-crusher':           { like: 'ex-tricep-pushdown', factor: 0.7 },
  // Legs
  'ex-barbell-front-squat':     { like: 'ex-barbell-back-squat', factor: 0.8 },
  'ex-pause-squat':             { like: 'ex-barbell-back-squat', factor: 0.88 },
  'ex-box-squat':               { like: 'ex-barbell-back-squat', factor: 0.95 },
  'ex-smith-machine-squat':     { like: 'ex-barbell-back-squat', factor: 1 },
  'ex-hack-squat':              { like: 'ex-barbell-back-squat', factor: 1 },
  'ex-romanian-deadlift':       { like: 'ex-conventional-deadlift', factor: 0.78, group: 'legs' },
  'ex-stiff-leg-deadlift':      { like: 'ex-conventional-deadlift', factor: 0.75, group: 'legs' },
  'ex-glute-bridge':            { like: 'ex-barbell-hip-thrust', factor: 0.9 },
  'ex-leg-curl':                { like: 'ex-leg-extension', factor: 0.7 },
  'ex-lying-leg-curl':          { like: 'ex-leg-extension', factor: 0.65 },
  'ex-seated-leg-curl':         { like: 'ex-leg-extension', factor: 0.7 },
}

const scale = (l: Levels, f: number): Levels => l.map(v => Math.round(v * f * 10) / 10) as unknown as Levels

function resolve(id: string): Standard | undefined {
  const base = BASE[id]
  if (base) return base
  const d = DERIVED[id]
  const like = d && BASE[d.like]
  if (!like || like.kind !== 'load') return undefined
  return { kind: 'load', group: d.group ?? like.group, male: scale(like.male, d.factor), female: scale(like.female, d.factor) }
}

const STANDARDS = new Map<string, Standard>(
  [...Object.keys(BASE), ...Object.keys(DERIVED)].flatMap(id => {
    const s = resolve(id)
    return s ? [[id, s] as const] : []
  }),
)

export const RANKED_EXERCISE_IDS: readonly string[] = [...STANDARDS.keys()]

export function standardFor(exerciseId: string): Standard | undefined {
  return STANDARDS.get(exerciseId)
}
