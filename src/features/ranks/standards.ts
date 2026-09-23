/**
 * Strength standards behind the rank ladder.
 *
 * Each ranked lift has five reference levels (≈ 5th / 20th / 50th / 80th / 95th
 * percentile of gym lifters, i.e. beginner → elite). The big lifts come from
 * public bodyweight-indexed strength standards (rounded); smaller and machine
 * lifts are estimates. Load/reps values are quoted at a reference bodyweight
 * (men 80 kg, women 60 kg) and scaled in `scoring.ts`.
 *
 * - `load`: estimated 1RM in kg. Dumbbell lifts use ONE dumbbell's weight.
 * - `reps`: reps at bodyweight. Negative = can't do one yet (needs assistance).
 * - `hold`: seconds held (planks, hangs), not bodyweight-scaled.
 *
 * Each lift ranks the muscle regions it mainly trains (the Bodygraph). Lifts
 * without their own data borrow a relative's standard × a factor.
 */

export type Sex = 'male' | 'female'

export type MuscleRegion =
  | 'chest'
  | 'front-delts' | 'side-delts' | 'rear-delts'
  | 'biceps' | 'triceps' | 'forearms'
  | 'lats' | 'traps' | 'lower-back'
  | 'abs' | 'obliques'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves'

export type MuscleGroup = 'chest' | 'shoulders' | 'arms' | 'back' | 'core' | 'legs'

type Levels = readonly [number, number, number, number, number]

interface Base { regions: readonly MuscleRegion[]; male: Levels; female: Levels }
export interface LoadStandard extends Base { kind: 'load' }
export interface RepsStandard extends Base {
  kind: 'reps'
  /** Share of bodyweight actually moved (push-ups move ~65%). */
  bodyShare: number
  /** The kg column is assistance (machine/band), not added weight. */
  assisted?: boolean
}
export interface HoldStandard extends Base { kind: 'hold' }
export type Standard = LoadStandard | RepsStandard | HoldStandard

export const REFERENCE_BODY_KG: Record<Sex, number> = { male: 80, female: 60 }

export const MUSCLE_GROUPS: { key: MuscleGroup; label: string; weight: number; regions: MuscleRegion[] }[] = [
  { key: 'chest',     label: 'Chest',     weight: 0.2,  regions: ['chest'] },
  { key: 'shoulders', label: 'Shoulders', weight: 0.15, regions: ['front-delts', 'side-delts', 'rear-delts'] },
  { key: 'arms',      label: 'Arms',      weight: 0.15, regions: ['biceps', 'triceps', 'forearms'] },
  { key: 'back',      label: 'Back',      weight: 0.25, regions: ['lats', 'traps', 'lower-back'] },
  { key: 'core',      label: 'Core',      weight: 0.1,  regions: ['abs', 'obliques'] },
  { key: 'legs',      label: 'Legs',      weight: 0.25, regions: ['quads', 'hamstrings', 'glutes', 'calves'] },
]

export const REGION_LABEL: Record<MuscleRegion, string> = {
  chest: 'Chest',
  'front-delts': 'Front delts', 'side-delts': 'Side delts', 'rear-delts': 'Rear delts',
  biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms',
  lats: 'Lats & upper back', traps: 'Traps', 'lower-back': 'Lower back',
  abs: 'Abs', obliques: 'Obliques',
  quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes', calves: 'Calves',
}

export function groupOfRegion(region: MuscleRegion): MuscleGroup {
  return MUSCLE_GROUPS.find(g => g.regions.includes(region))?.key ?? 'legs'
}

type R = readonly MuscleRegion[]
const load = (regions: R, male: Levels, female: Levels): LoadStandard => ({ kind: 'load', regions, male, female })
const reps = (regions: R, bodyShare: number, male: Levels, female: Levels, assisted = false): RepsStandard => ({ kind: 'reps', regions, bodyShare, male, female, assisted })
const hold = (regions: R, male: Levels, female: Levels): HoldStandard => ({ kind: 'hold', regions, male, female })

// ── Measured standards (public bodyweight-indexed tables, rounded) ────────────
const BENCH = load(['chest'], [56, 75, 98, 124, 151], [19, 31, 47, 66, 88])
const SQUAT = load(['quads', 'glutes'], [75, 101, 132, 168, 206], [32, 49, 72, 99, 129])
const DEADLIFT = load(['lower-back', 'glutes', 'hamstrings'], [89, 119, 155, 196, 239], [40, 60, 86, 116, 149])
const OHP = load(['front-delts'], [33, 46, 62, 81, 101], [12, 20, 31, 43, 57])
const ROW = load(['lats'], [48, 66, 88, 114, 141], [18, 29, 43, 59, 78])
const PULLDOWN = load(['lats'], [47, 64, 85, 108, 133], [23, 33, 46, 60, 76])
const DB_BENCH = load(['chest'], [19, 28, 40, 53, 68], [7, 12, 19, 28, 38])
const DB_CURL = load(['biceps'], [8, 14, 22, 32, 42], [4, 7, 12, 18, 24])
const PUSHDOWN = load(['triceps'], [22, 36, 56, 80, 107], [9, 17, 28, 42, 59])
const LATERAL = load(['side-delts'], [5, 10, 16, 25, 34], [3, 6, 9, 13, 17])
const LEG_PRESS = load(['quads'], [109, 162, 230, 309, 395], [49, 87, 140, 204, 277])
const HIP_THRUST = load(['glutes'], [56, 96, 149, 213, 285], [35, 63, 100, 147, 199])
const LEG_EXT = load(['quads'], [48, 72, 103, 140, 180], [22, 38, 59, 86, 115])
const PULL_UP = reps(['lats'], 1, [-3, 6, 13, 21, 29], [-9, -3, 6, 13, 21])
const DIP = reps(['triceps', 'chest'], 0.95, [4, 10, 20, 31, 42], [-4, 1, 9, 19, 30])
const PUSH_UP = reps(['chest'], 0.65, [6, 20, 38, 60, 83], [-5, 7, 18, 31, 47])

// ── Estimated standards (smaller muscles, bodyweight moves, holds) ────────────
const CALF_RAISE = load(['calves'], [45, 75, 115, 165, 220], [25, 45, 75, 110, 150])
const WRIST_CURL = load(['forearms'], [15, 25, 40, 55, 75], [7, 12, 20, 30, 40])
const SHRUG = load(['traps'], [60, 100, 145, 195, 250], [30, 50, 75, 105, 140])
const REAR_DELT_MACHINE = load(['rear-delts'], [20, 35, 55, 80, 105], [10, 18, 28, 40, 55])
const CABLE_CRUNCH = load(['abs'], [25, 40, 60, 85, 110], [12, 22, 35, 50, 65])
const WOOD_CHOP = load(['obliques'], [10, 18, 28, 40, 52], [5, 10, 16, 23, 30])
const SIDE_BEND = load(['obliques'], [16, 26, 38, 50, 65], [8, 14, 20, 28, 36])
const CHIN_UP = { ...PULL_UP, regions: ['lats', 'biceps'] } satisfies RepsStandard

const BASE: Record<string, Standard> = {
  // Chest
  'ex-barbell-bench-press': BENCH,
  'ex-dumbbell-bench-press': DB_BENCH,
  'ex-push-up': PUSH_UP,
  'ex-ring-dip': DIP,
  'ex-kneeling-push-up': reps(['chest'], 0.5, [8, 20, 35, 50, 70], [3, 12, 25, 40, 55]),
  'ex-archer-push-up': reps(['chest'], 0.8, [1, 4, 10, 16, 24], [1, 2, 5, 10, 15]),
  // Back
  'ex-conventional-deadlift': DEADLIFT,
  'ex-barbell-row': ROW,
  'ex-lat-pulldown': PULLDOWN,
  'ex-pull-up': PULL_UP,
  'ex-wide-grip-pull-up': PULL_UP,
  'ex-neutral-grip-pull-up': PULL_UP,
  'ex-chin-up': CHIN_UP,
  'ex-assisted-pull-up': { ...PULL_UP, assisted: true },
  'ex-muscle-up': reps(['lats', 'triceps'], 1, [-5, 1, 3, 7, 12], [-8, -2, 1, 3, 6]),
  'ex-inverted-row': reps(['lats'], 0.6, [3, 8, 15, 22, 30], [1, 5, 10, 16, 24]),
  'ex-ring-row': reps(['lats'], 0.6, [3, 8, 15, 22, 30], [1, 5, 10, 16, 24]),
  'ex-barbell-shrug': SHRUG,
  'ex-hyperextension': reps(['lower-back', 'glutes'], 0.6, [5, 15, 25, 40, 55], [3, 10, 20, 32, 45]),
  // Shoulders
  'ex-overhead-press': OHP,
  'ex-lateral-raise': LATERAL,
  'ex-reverse-pec-deck': REAR_DELT_MACHINE,
  'ex-machine-rear-delt-fly': REAR_DELT_MACHINE,
  'ex-handstand-push-up': reps(['front-delts', 'triceps'], 0.9, [-4, 1, 5, 10, 16], [-6, -2, 1, 5, 10]),
  'ex-pike-push-up': reps(['front-delts'], 0.5, [3, 8, 15, 25, 35], [1, 5, 10, 18, 26]),
  // Arms
  'ex-dumbbell-curl': DB_CURL,
  'ex-tricep-pushdown': PUSHDOWN,
  'ex-dip': DIP,
  'ex-assisted-dip': { ...DIP, assisted: true },
  'ex-bench-dip': reps(['triceps'], 0.6, [5, 15, 25, 40, 55], [3, 10, 20, 30, 45]),
  'ex-diamond-push-up': reps(['triceps', 'chest'], 0.65, [3, 12, 25, 40, 55], [-3, 4, 12, 22, 34]),
  'ex-close-grip-push-up': reps(['triceps', 'chest'], 0.65, [4, 14, 28, 44, 60], [-2, 5, 14, 25, 38]),
  'ex-wrist-curl': WRIST_CURL,
  'ex-dead-hang': hold(['forearms'], [10, 30, 60, 90, 120], [8, 20, 45, 70, 100]),
  // Core
  'ex-cable-crunch': CABLE_CRUNCH,
  'ex-wood-chop': WOOD_CHOP,
  'ex-dumbbell-side-bend': SIDE_BEND,
  'ex-plank': hold(['abs'], [15, 45, 90, 180, 300], [15, 40, 80, 150, 270]),
  'ex-side-plank': hold(['obliques'], [10, 30, 60, 90, 150], [10, 25, 50, 80, 130]),
  'ex-copenhagen-plank': hold(['obliques'], [5, 15, 30, 45, 60], [5, 12, 25, 40, 55]),
  'ex-hollow-hold': hold(['abs'], [10, 20, 40, 60, 90], [10, 20, 35, 55, 80]),
  'ex-l-sit': hold(['abs'], [3, 8, 15, 25, 40], [2, 6, 12, 20, 32]),
  'ex-hanging-leg-raise': reps(['abs'], 0.35, [1, 6, 12, 20, 30], [1, 4, 9, 15, 24]),
  'ex-knee-raise': reps(['abs'], 0.3, [3, 10, 20, 30, 45], [2, 7, 15, 24, 36]),
  'ex-toes-to-bar': reps(['abs'], 0.4, [1, 4, 10, 18, 28], [1, 3, 7, 13, 20]),
  'ex-ab-wheel-rollout': reps(['abs'], 0.5, [2, 8, 15, 25, 40], [1, 5, 10, 18, 30]),
  'ex-sit-up': reps(['abs'], 0.4, [12, 25, 45, 65, 90], [8, 20, 35, 55, 75]),
  'ex-decline-sit-up': reps(['abs'], 0.45, [8, 18, 30, 45, 60], [5, 12, 22, 35, 50]),
  'ex-crunch': reps(['abs'], 0.3, [15, 30, 50, 75, 100], [10, 25, 40, 60, 85]),
  'ex-dragon-flag': reps(['abs'], 0.7, [1, 2, 5, 9, 14], [1, 2, 4, 7, 11]),
  'ex-hanging-windshield-wiper': reps(['obliques', 'abs'], 0.4, [1, 4, 10, 16, 24], [1, 3, 6, 11, 18]),
  // Legs
  'ex-barbell-back-squat': SQUAT,
  'ex-leg-press': LEG_PRESS,
  'ex-barbell-hip-thrust': HIP_THRUST,
  'ex-leg-extension': LEG_EXT,
  'ex-standing-calf-raise': CALF_RAISE,
  'ex-pistol-squat': reps(['quads', 'glutes'], 0.85, [-2, 1, 5, 10, 18], [-4, -1, 3, 7, 13]),
  'ex-nordic-curl': reps(['hamstrings'], 0.7, [1, 3, 6, 10, 15], [1, 2, 4, 7, 11]),
  'ex-glute-ham-raise': reps(['hamstrings'], 0.7, [1, 5, 10, 16, 24], [1, 3, 7, 12, 18]),
  'ex-wall-sit': hold(['quads'], [20, 45, 90, 150, 240], [20, 45, 80, 140, 220]),
}

interface Derived { like: string; factor: number; regions?: readonly MuscleRegion[] }

// Rough ratios to the base lift (typical 1RM relationships).
const DERIVED: Record<string, Derived> = {
  // Chest
  'ex-incline-barbell-press':   { like: 'ex-barbell-bench-press', factor: 0.82 },
  'ex-decline-bench-press':     { like: 'ex-barbell-bench-press', factor: 1.02 },
  'ex-pause-bench-press':       { like: 'ex-barbell-bench-press', factor: 0.92 },
  'ex-close-grip-bench-press':  { like: 'ex-barbell-bench-press', factor: 0.88, regions: ['triceps', 'chest'] },
  'ex-floor-press':             { like: 'ex-barbell-bench-press', factor: 0.9 },
  'ex-smith-machine-bench':     { like: 'ex-barbell-bench-press', factor: 1 },
  'ex-incline-smith-press':     { like: 'ex-barbell-bench-press', factor: 0.85 },
  'ex-machine-chest-press':     { like: 'ex-barbell-bench-press', factor: 1.05 },
  'ex-machine-incline-press':   { like: 'ex-barbell-bench-press', factor: 0.9 },
  'ex-jm-press':                { like: 'ex-barbell-bench-press', factor: 0.55, regions: ['triceps'] },
  'ex-incline-dumbbell-press':  { like: 'ex-dumbbell-bench-press', factor: 0.85 },
  'ex-decline-dumbbell-press':  { like: 'ex-dumbbell-bench-press', factor: 1 },
  'ex-dumbbell-floor-press':    { like: 'ex-dumbbell-bench-press', factor: 0.9 },
  // Back
  'ex-sumo-deadlift':           { like: 'ex-conventional-deadlift', factor: 1, regions: ['glutes', 'quads', 'lower-back'] },
  'ex-trap-bar-deadlift':       { like: 'ex-conventional-deadlift', factor: 1.08, regions: ['quads', 'glutes', 'lower-back'] },
  'ex-deficit-deadlift':        { like: 'ex-conventional-deadlift', factor: 0.92 },
  'ex-rack-pull':               { like: 'ex-conventional-deadlift', factor: 1.15, regions: ['traps', 'lower-back'] },
  'ex-snatch-grip-deadlift':    { like: 'ex-conventional-deadlift', factor: 0.85, regions: ['traps', 'lower-back', 'glutes'] },
  'ex-dumbbell-deadlift':       { like: 'ex-conventional-deadlift', factor: 0.4 },
  'ex-power-clean':             { like: 'ex-conventional-deadlift', factor: 0.55, regions: ['traps', 'glutes'] },
  'ex-good-morning':            { like: 'ex-barbell-back-squat', factor: 0.5, regions: ['lower-back', 'hamstrings'] },
  'ex-pendlay-row':             { like: 'ex-barbell-row', factor: 0.95 },
  'ex-t-bar-row':               { like: 'ex-barbell-row', factor: 1 },
  'ex-chest-supported-t-bar-row': { like: 'ex-barbell-row', factor: 0.8 },
  'ex-seal-row':                { like: 'ex-barbell-row', factor: 0.85 },
  'ex-dumbbell-row':            { like: 'ex-barbell-row', factor: 0.48 },
  'ex-single-arm-dumbbell-row': { like: 'ex-barbell-row', factor: 0.48 },
  'ex-kroc-row':                { like: 'ex-barbell-row', factor: 0.55 },
  'ex-chest-supported-row':     { like: 'ex-barbell-row', factor: 0.4 },
  'ex-cable-row':               { like: 'ex-lat-pulldown', factor: 1 },
  'ex-wide-grip-cable-row':     { like: 'ex-lat-pulldown', factor: 0.9, regions: ['lats', 'rear-delts'] },
  'ex-single-arm-cable-row':    { like: 'ex-lat-pulldown', factor: 0.55 },
  'ex-machine-row':             { like: 'ex-lat-pulldown', factor: 1 },
  'ex-wide-grip-lat-pulldown':  { like: 'ex-lat-pulldown', factor: 0.95 },
  'ex-close-grip-lat-pulldown': { like: 'ex-lat-pulldown', factor: 1 },
  'ex-neutral-grip-lat-pulldown': { like: 'ex-lat-pulldown', factor: 1 },
  'ex-machine-lat-pulldown':    { like: 'ex-lat-pulldown', factor: 1.05 },
  'ex-single-arm-lat-pulldown': { like: 'ex-lat-pulldown', factor: 0.55 },
  'ex-reverse-grip-pulldown':   { like: 'ex-lat-pulldown', factor: 1, regions: ['lats', 'biceps'] },
  'ex-dumbbell-shrug':          { like: 'ex-barbell-shrug', factor: 0.42 },
  // Shoulders
  'ex-seated-shoulder-press':   { like: 'ex-overhead-press', factor: 1 },
  'ex-machine-shoulder-press':  { like: 'ex-overhead-press', factor: 1.1 },
  'ex-smith-shoulder-press':    { like: 'ex-overhead-press', factor: 1.05 },
  'ex-behind-neck-press':       { like: 'ex-overhead-press', factor: 0.85, regions: ['front-delts', 'side-delts'] },
  'ex-z-press':                 { like: 'ex-overhead-press', factor: 0.85 },
  'ex-push-press':              { like: 'ex-overhead-press', factor: 1.25 },
  'ex-dumbbell-shoulder-press': { like: 'ex-overhead-press', factor: 0.42 },
  'ex-arnold-press':            { like: 'ex-overhead-press', factor: 0.38 },
  'ex-kettlebell-press':        { like: 'ex-overhead-press', factor: 0.4 },
  'ex-upright-row':             { like: 'ex-overhead-press', factor: 0.72, regions: ['side-delts', 'traps'] },
  'ex-front-raise':             { like: 'ex-lateral-raise', factor: 1.05, regions: ['front-delts'] },
  'ex-plate-front-raise':       { like: 'ex-lateral-raise', factor: 1.4, regions: ['front-delts'] },
  'ex-cable-front-raise':       { like: 'ex-lateral-raise', factor: 0.9, regions: ['front-delts'] },
  'ex-cable-lateral-raise':     { like: 'ex-lateral-raise', factor: 0.6 },
  'ex-lean-away-lateral-raise': { like: 'ex-lateral-raise', factor: 0.8 },
  'ex-machine-lateral-raise':   { like: 'ex-lateral-raise', factor: 2.4 },
  'ex-rear-delt-fly':           { like: 'ex-lateral-raise', factor: 0.85, regions: ['rear-delts'] },
  'ex-cable-rear-delt-fly':     { like: 'ex-lateral-raise', factor: 0.6, regions: ['rear-delts'] },
  'ex-rear-delt-row':           { like: 'ex-lateral-raise', factor: 1.3, regions: ['rear-delts'] },
  'ex-face-pull':               { like: 'ex-tricep-pushdown', factor: 0.85, regions: ['rear-delts'] },
  // Arms
  'ex-barbell-curl':            { like: 'ex-dumbbell-curl', factor: 2.1 },
  'ex-ez-bar-curl':             { like: 'ex-dumbbell-curl', factor: 2 },
  'ex-cable-curl':              { like: 'ex-dumbbell-curl', factor: 1.8 },
  'ex-machine-bicep-curl':      { like: 'ex-dumbbell-curl', factor: 1.8 },
  'ex-drag-curl':               { like: 'ex-dumbbell-curl', factor: 1.7 },
  'ex-preacher-curl':           { like: 'ex-dumbbell-curl', factor: 1.7 },
  'ex-dumbbell-preacher-curl':  { like: 'ex-dumbbell-curl', factor: 0.8 },
  'ex-bayesian-curl':           { like: 'ex-dumbbell-curl', factor: 0.8 },
  'ex-incline-dumbbell-curl':   { like: 'ex-dumbbell-curl', factor: 0.85 },
  'ex-concentration-curl':      { like: 'ex-dumbbell-curl', factor: 0.9 },
  'ex-spider-curl':             { like: 'ex-dumbbell-curl', factor: 0.8 },
  'ex-hammer-curl':             { like: 'ex-dumbbell-curl', factor: 1.1, regions: ['biceps', 'forearms'] },
  'ex-cross-body-hammer-curl':  { like: 'ex-dumbbell-curl', factor: 1.1, regions: ['biceps', 'forearms'] },
  'ex-rope-hammer-curl':        { like: 'ex-dumbbell-curl', factor: 1.8, regions: ['forearms', 'biceps'] },
  'ex-zottman-curl':            { like: 'ex-dumbbell-curl', factor: 0.85, regions: ['biceps', 'forearms'] },
  'ex-reverse-curl':            { like: 'ex-dumbbell-curl', factor: 1.6, regions: ['forearms'] },
  'ex-reverse-wrist-curl':      { like: 'ex-wrist-curl', factor: 0.6 },
  'ex-rope-tricep-extension':   { like: 'ex-tricep-pushdown', factor: 0.85 },
  'ex-reverse-grip-pushdown':   { like: 'ex-tricep-pushdown', factor: 0.75 },
  'ex-single-arm-pushdown':     { like: 'ex-tricep-pushdown', factor: 0.45 },
  'ex-skull-crusher':           { like: 'ex-tricep-pushdown', factor: 0.7 },
  'ex-dumbbell-skull-crusher':  { like: 'ex-tricep-pushdown', factor: 0.3 },
  'ex-ez-bar-overhead-extension': { like: 'ex-tricep-pushdown', factor: 0.7 },
  'ex-overhead-tricep-extension': { like: 'ex-tricep-pushdown', factor: 0.55 },
  'ex-cable-overhead-extension': { like: 'ex-tricep-pushdown', factor: 0.75 },
  'ex-tricep-kickback':         { like: 'ex-tricep-pushdown', factor: 0.2 },
  'ex-machine-dip':             { like: 'ex-tricep-pushdown', factor: 1.8 },
  // Core
  'ex-machine-crunch':          { like: 'ex-cable-crunch', factor: 1.1 },
  'ex-pallof-press':            { like: 'ex-wood-chop', factor: 0.9 },
  'ex-weighted-russian-twist':  { like: 'ex-wood-chop', factor: 0.55 },
  // Legs
  'ex-barbell-front-squat':     { like: 'ex-barbell-back-squat', factor: 0.8, regions: ['quads'] },
  'ex-pause-squat':             { like: 'ex-barbell-back-squat', factor: 0.88 },
  'ex-box-squat':               { like: 'ex-barbell-back-squat', factor: 0.95 },
  'ex-smith-machine-squat':     { like: 'ex-barbell-back-squat', factor: 1 },
  'ex-hack-squat':              { like: 'ex-barbell-back-squat', factor: 1, regions: ['quads'] },
  'ex-pendulum-squat':          { like: 'ex-barbell-back-squat', factor: 1, regions: ['quads'] },
  'ex-belt-squat':              { like: 'ex-barbell-back-squat', factor: 1 },
  'ex-safety-bar-squat':        { like: 'ex-barbell-back-squat', factor: 0.9 },
  'ex-zercher-squat':           { like: 'ex-barbell-back-squat', factor: 0.8 },
  'ex-goblet-squat':            { like: 'ex-barbell-back-squat', factor: 0.35 },
  'ex-barbell-lunge':           { like: 'ex-barbell-back-squat', factor: 0.6 },
  'ex-bulgarian-split-squat':   { like: 'ex-barbell-back-squat', factor: 0.25 },
  'ex-split-squat':             { like: 'ex-barbell-back-squat', factor: 0.3 },
  'ex-reverse-lunge':           { like: 'ex-barbell-back-squat', factor: 0.28 },
  'ex-dumbbell-lunge':          { like: 'ex-barbell-back-squat', factor: 0.28 },
  'ex-walking-lunge':           { like: 'ex-barbell-back-squat', factor: 0.28 },
  'ex-step-up':                 { like: 'ex-barbell-back-squat', factor: 0.25 },
  'ex-single-leg-leg-press':    { like: 'ex-leg-press', factor: 0.55 },
  'ex-romanian-deadlift':       { like: 'ex-conventional-deadlift', factor: 0.78, regions: ['hamstrings', 'glutes'] },
  'ex-stiff-leg-deadlift':      { like: 'ex-conventional-deadlift', factor: 0.75, regions: ['hamstrings', 'glutes'] },
  'ex-dumbbell-rdl':            { like: 'ex-conventional-deadlift', factor: 0.35, regions: ['hamstrings', 'glutes'] },
  'ex-glute-bridge':            { like: 'ex-barbell-hip-thrust', factor: 0.9 },
  'ex-hip-thrust-machine':      { like: 'ex-barbell-hip-thrust', factor: 1 },
  'ex-smith-hip-thrust':        { like: 'ex-barbell-hip-thrust', factor: 1 },
  'ex-cable-kickback':          { like: 'ex-barbell-hip-thrust', factor: 0.2 },
  'ex-cable-pull-through':      { like: 'ex-barbell-hip-thrust', factor: 0.35, regions: ['glutes', 'hamstrings'] },
  'ex-leg-curl':                { like: 'ex-leg-extension', factor: 0.7, regions: ['hamstrings'] },
  'ex-lying-leg-curl':          { like: 'ex-leg-extension', factor: 0.65, regions: ['hamstrings'] },
  'ex-seated-leg-curl':         { like: 'ex-leg-extension', factor: 0.7, regions: ['hamstrings'] },
  'ex-standing-leg-curl':       { like: 'ex-leg-extension', factor: 0.3, regions: ['hamstrings'] },
  'ex-seated-calf-raise':       { like: 'ex-standing-calf-raise', factor: 0.75 },
  'ex-calf-press':              { like: 'ex-standing-calf-raise', factor: 1.3 },
  'ex-donkey-calf-raise':       { like: 'ex-standing-calf-raise', factor: 1.1 },
}

const scale = (l: Levels, f: number): Levels => l.map(v => Math.round(v * f * 10) / 10) as unknown as Levels

function resolve(id: string): Standard | undefined {
  const base = BASE[id]
  if (base) return base
  const d = DERIVED[id]
  const like = d && BASE[d.like]
  if (!like || like.kind !== 'load') return undefined
  return { kind: 'load', regions: d.regions ?? like.regions, male: scale(like.male, d.factor), female: scale(like.female, d.factor) }
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

/** The group a lift is listed under: the group of its main region. */
export function groupOfStandard(std: Standard): MuscleGroup {
  return groupOfRegion(std.regions[0])
}

/** Ranked exercises that train a region (for "rank it with…" hints). */
export function exercisesForRegion(region: MuscleRegion): string[] {
  return RANKED_EXERCISE_IDS.filter(id => STANDARDS.get(id)?.regions.includes(region))
}
