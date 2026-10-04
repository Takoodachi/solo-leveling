import type { Exercise } from '@/types'
import { standardFor } from '@/features/ranks/standards'
import { resolveBodyKg, setModeFor } from '@/lib/workoutMath'
import type { LastSet, LiftTrend, PastSession, SetDraft } from './types'

/**
 * "What to try today" for a lift, from the last session (double progression): add reps at the
 * same weight until every working set reaches the rep target, then take the next weight up and
 * build the reps again.
 *
 * What differs by exercise:
 * - Rep target: the routine's reps when the block came from one, else 8 for barbell compounds,
 *   10 for other compounds, 12 for single-joint lifts, 15 for small-muscle raises.
 * - Jump: the smallest step between the lifter's own working weights on that exercise, else a
 *   default for the equipment. The same step is a far bigger share of a light lift (2 kg on an
 *   8 kg lateral raise is +25%, 2.5 kg on a 100 kg squat +2.5%), so the reps to reach before a
 *   jump are however many Epley says keep the heavier weight inside the range, at most five
 *   past the target.
 * - Bodyweight moves count bodyweight in the load; assisted ones progress by taking help off.
 *
 * Sources: ACSM's progression models (2–10% more load once the target reps are exceeded,
 * smaller jumps for small-muscle and single-joint lifts); Plotkin et al. 2022 (adding reps and
 * adding load build muscle and strength about equally); detraining reviews (strength holds for
 * 3–4 weeks off, then falls roughly 5–15% over 4–8 weeks). The plateau reset (take 10% off
 * after three flat sessions) is coaching practice, not a trial result.
 */

export interface HintFill {
  /** Weight for the sets that are empty or still at `from`. */
  weight?: number
  from?: number
  /** Reps by set position (the last one repeats). */
  reps?: number[]
}

export interface ProgressHint {
  kind: 'weight' | 'reps' | 'ease' | 'reset'
  title: string
  why: string
  /** What "Use" writes into the sets not done yet. */
  fill?: HintFill
}

export interface ProgressInput {
  exercise: Pick<Exercise, 'uuid' | 'name' | 'type' | 'defaultUnit'>
  lastSets?: LastSet[]
  trend?: LiftTrend
  /** The routine's rep target, when the block came from a routine. */
  targetReps?: number
  bodyKg?: number
}

/** Same cap as the rank scoring: past this, Epley measures endurance. */
const MAX_REPS = 20
const EXTRA_REPS = 5
const EASE_AFTER_DAYS = 28
const LONG_BREAK_DAYS = 56
const FLAT_SESSIONS = 3
const DAY_MS = 86_400_000

type Gear = 'barbell' | 'dumbbell' | 'kettlebell' | 'cable' | 'machine' | 'other'

const SMALL = /lateral raise|front raise|rear delt|reverse pec deck|face pull|y-raise|wrist curl|kickback|rotation/
const SINGLE_JOINT = /curl|extension|pushdown|fly|crossover|pec deck|raise|adductor|abductor|crunch|pullover|shrug|skull crusher|twist|chop|pallof|straight-arm|sit-up/
const HARD_BODYWEIGHT = /pull-up|chin-up|dip|nordic|pistol|toes-to-bar|muscle-up|handstand/

function gearOf(name: string): Gear {
  if (/kettlebell/.test(name)) return 'kettlebell'
  if (/cable|pulldown|pushdown|face pull|rope|crossover|pallof|chop/.test(name)) return 'cable'
  if (/barbell|ez-bar|smith/.test(name)) return 'barbell'
  if (/machine|leg press|hack squat|pec deck|leg extension|leg curl|adductor|abductor|calf|assisted/.test(name)) return 'machine'
  if (/dumbbell|goblet|arnold|hammer curl|concentration|lateral raise|front raise|rear delt fly|y-raise|kickback|incline curl|spider curl|split squat|lunge|step-up|single-leg|shrug/.test(name)) return 'dumbbell'
  if (/bench press|deadlift|squat|overhead press|push press|row|skull crusher|good morning|hip thrust|clean|landmine|rack pull|jm press|preacher|floor press|21s/.test(name)) return 'barbell'
  return 'other'
}

/** The usual smallest jump on this equipment, until the lifter's own history shows the real one. */
function defaultStep(gear: Gear, name: string, kg: number): number {
  switch (gear) {
    case 'dumbbell': return kg < 10 ? 1 : 2.5
    case 'kettlebell': return 4
    case 'machine': return 5
    case 'barbell': return kg >= 100 && /deadlift|squat|hip thrust|rack pull/.test(name) ? 5 : 2.5
    default: return 2.5
  }
}

function defaultTarget(name: string, gear: Gear): number {
  if (SMALL.test(name)) return 15
  if (SINGLE_JOINT.test(name)) return 12
  return gear === 'barbell' ? 8 : 10
}

const round = (n: number) => Math.round(n * 100) / 100
const kg = (n: number) => String(round(n))
const list = (reps: number[]) => reps.join(' · ')
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const weeksSince = (days: number) => `${Math.round(days / 7)} weeks`

/** Reps Epley predicts at `to` kg for someone who did `reps` at `from` kg. */
function repsAt(from: number, reps: number, to: number): number {
  if (to <= 0) return Infinity
  return 30 * ((from * (1 + Math.min(reps, MAX_REPS) / 30)) / to - 1)
}

/** A session's working weight (its heaviest; 0 at bodyweight) and the reps done there, in order. */
function workOf(sets: LastSet[]): { weight: number; reps: number[] } {
  const done = sets.filter(s => (s.reps ?? 0) > 0)
  const weight = Math.max(0, ...done.map(s => s.weight ?? 0))
  return { weight, reps: done.filter(s => (s.weight ?? 0) === weight).map(s => s.reps ?? 0) }
}

/** Earlier sessions (newest first) boiled down to what the hint needs. */
export function trendOf(sessions: PastSession[], now: number): LiftTrend | undefined {
  if (sessions.length === 0) return undefined
  const [latest, ...earlier] = sessions.map(s => workOf(s.sets))
  let flat = 1
  for (const e of earlier) {
    // Compared over the sets both sessions have, so a short session isn't read as a plateau
    const n = Math.min(e.reps.length, latest.reps.length)
    if (e.weight !== latest.weight || n === 0 || sum(e.reps.slice(0, n)) < sum(latest.reps.slice(0, n))) break
    flat++
  }
  const weights = [...new Set([latest, ...earlier].map(w => w.weight).filter(w => w > 0))].sort((a, b) => a - b)
  const gaps = weights.slice(1).map((w, i) => round(w - weights[i])).filter(g => g >= 0.25)
  return {
    gapDays: Math.max(0, Math.floor((now - sessions[0].at) / DAY_MS)),
    step: gaps.length > 0 ? Math.min(...gaps) : undefined,
    flat,
  }
}

export function suggestProgress({ exercise, lastSets, trend, targetReps, bodyKg }: ProgressInput): ProgressHint | null {
  if (setModeFor(exercise) !== 'load') return null
  const sets = (lastSets ?? []).filter(s => (s.reps ?? 0) > 0)
  if (sets.length === 0) return null

  const name = exercise.name.toLowerCase()
  const std = standardFor(exercise.uuid)
  const assisted = (std?.kind === 'reps' && !!std.assisted) || name.includes('assisted')
  const gapDays = trend?.gapDays ?? 0
  const weights = sets.flatMap(s => ((s.weight ?? 0) > 0 ? [s.weight ?? 0] : []))
  if (weights.length === 0) {
    return bodyweightHint(sets.map(s => s.reps ?? 0), targetReps ?? (HARD_BODYWEIGHT.test(name) ? 12 : MAX_REPS), gapDays, assisted)
  }

  // The working weight: the heaviest of the session (with assistance, the least help)
  const top = assisted ? Math.min(...weights) : Math.max(...weights)
  const work = sets.filter(s => s.weight === top).map(s => s.reps ?? 0)
  const straight = sets.every(s => s.weight === top)
  const least = Math.min(...work)
  const every = work.length > 1 ? ' on every set' : ''

  // Bodyweight moves lift part of the body too, so a small plate is a small jump
  const body = std?.kind === 'reps' ? resolveBodyKg(bodyKg) * std.bodyShare : exercise.type === 'bodyweight' ? resolveBodyKg(bodyKg) : 0
  const moved = (w: number) => (assisted ? Math.max(1, body - w) : body + w)
  const gear = gearOf(name)
  const usual = assisted ? 5 : body > 0 ? 2.5 : defaultStep(gear, name, top)
  const step = trend?.step && trend.step <= usual * 2 ? trend.step : usual
  const stepsFor = (share: number) => Math.max(1, Math.round((moved(top) * share) / step)) * step
  const next = assisted ? Math.max(0, round(top - step)) : round(top + step)

  const target = Math.max(1, Math.round(targetReps ?? defaultTarget(name, gear)))
  const low = Math.max(1, target - (target >= 15 ? 4 : target >= 11 ? 3 : 2))
  const most = Math.max(target, Math.min(MAX_REPS, target + EXTRA_REPS))
  const after = (reps: number) => Math.round(repsAt(moved(top), reps, moved(next)))
  let need = target
  while (need < most && after(need) < low) need++

  if (gapDays >= EASE_AFTER_DAYS) {
    const percent = gapDays >= LONG_BREAK_DAYS ? 15 : 10
    const eased = assisted ? round(top + stepsFor(percent / 100)) : Math.max(0, round(top - stepsFor(percent / 100)))
    return {
      kind: 'ease',
      title: eased > 0 ? `Ease back in at ${kg(eased)} kg` : 'Ease back in at bodyweight',
      why: `${weeksSince(gapDays)} since you last did this. Start about ${percent}% ${assisted ? 'easier' : 'lighter'}, match last time’s reps (${list(work)}), then build back up.`,
      fill: eased > 0 ? { weight: eased, from: top } : undefined,
    }
  }

  if (least >= need) {
    const big = after(least) < low
    return {
      kind: 'weight',
      title: !assisted ? `Go up to ${kg(next)} kg` : next > 0 ? `Take some help off: ${kg(next)} kg` : 'Try it without assistance',
      why: `You got ${need}${work.some(r => r > need) ? '+' : ''} reps${every} at ${kg(top)} kg${assisted ? ' of assistance' : ''}. ${
        big ? 'It’s a big jump, so fewer reps at first is fine.' : `Aim for ${low}–${target} reps.`
      }`,
      fill: next > 0 ? { weight: next, from: top } : undefined,
    }
  }

  const reset = round(top - stepsFor(0.1))
  if (!assisted && (trend?.flat ?? 0) >= FLAT_SESSIONS && reset > 0) {
    return {
      kind: 'reset',
      title: `Try a reset at ${kg(reset)} kg`,
      why: `${trend?.flat} sessions at ${kg(top)} kg without more reps. Taking about 10% off and building back up usually gets past a plateau.`,
      fill: { weight: reset, from: top },
    }
  }

  const goals = work.map(r => (r >= need ? r : r + 1))
  const then = !assisted ? `go up to ${kg(next)} kg` : next > 0 ? `drop to ${kg(next)} kg of assistance` : 'try it without assistance'
  // Past the usual target: say why, or the number reads like a mistake
  const heavier = Math.round((moved(next) / moved(top) - 1) * 100)
  const when = need <= target
    ? `At ${need}${every}, ${then}.`
    : assisted
      ? `Less help is a big step, so build to ${need}${every}, then ${then}.`
      : `${kg(next)} kg is ${heavier}% heavier, so build to ${need}${every} first.`
  return {
    kind: 'reps',
    title: assisted ? 'Same assistance, add reps' : `Stay at ${kg(top)} kg, add reps`,
    why: `Aim for ${list(goals)} (last time ${list(work)}). ${when}`,
    fill: straight ? { weight: top, from: top, reps: goals } : undefined,
  }
}

/** Reps-only sets: add a rep until every set reaches the target, then make the move harder. */
function bodyweightHint(reps: number[], targetReps: number, gapDays: number, assisted: boolean): ProgressHint {
  const target = Math.max(1, Math.round(targetReps))
  const every = reps.length > 1 ? ' on every set' : ''
  const harder = assisted ? 'use less assistance' : 'add a little weight or try a harder variation'
  if (gapDays >= EASE_AFTER_DAYS) {
    return {
      kind: 'ease',
      title: 'Ease back in',
      why: `${weeksSince(gapDays)} since you last did this. Match last time (${list(reps)}) before pushing on.`,
      fill: { reps },
    }
  }
  if (Math.min(...reps) >= target) {
    return {
      kind: 'weight',
      title: assisted ? 'Use less assistance' : 'Time to make it harder',
      why: `You got ${target}${reps.some(r => r > target) ? '+' : ''} reps${every}. Next, ${harder}.`,
    }
  }
  const goals = reps.map(r => (r >= target ? r : r + 1))
  return {
    kind: 'reps',
    title: 'Add a rep',
    why: `Aim for ${list(goals)} (last time ${list(reps)}). At ${target}${every}, ${harder}.`,
    fill: { reps: goals },
  }
}

/** The sets with a hint's numbers written into the ones not done yet (unchanged sets keep their identity). */
export function applyFill(sets: SetDraft[], fill: HintFill): SetDraft[] {
  return sets.map((s, i) => {
    if (s.done) return s
    const swap = fill.weight != null && (s.weight.trim() === '' || Number(s.weight) === fill.from)
    const weight = swap ? kg(fill.weight ?? 0) : s.weight
    const reps = fill.reps?.length ? String(fill.reps[Math.min(i, fill.reps.length - 1)]) : s.reps
    return weight === s.weight && reps === s.reps ? s : { ...s, weight, reps }
  })
}
