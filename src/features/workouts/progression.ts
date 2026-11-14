import type { Exercise, WeightUnit } from '@/types'
import { standardFor } from '@/features/ranks/standards'
import { resolveBodyKg, setModeFor } from '@/lib/workoutMath'
import type { LastSet, LiftTrend, PastSession, SetDraft } from './types'
import type { OrderEffect } from './fatigue'
import { effortFromRpe, type Effort } from './effort'
import { fromKg, isLb, lastSetsIn, stepFromKg } from './units'

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
 *   past the target. The other way round, reps so far past the target that one step would still
 *   leave them at or over it take more than one step: as many as keep the reps in the range, up
 *   to 10% heavier (5% on single-joint lifts), the span ACSM gives.
 * - Bodyweight moves count bodyweight in the load; assisted ones progress by taking help off.
 * - An exercise logged in pounds is worked out in pounds, with the jumps a pound gym has (5 lb on
 *   a bar, 10 on a stack) and targets on the 2.5 lb grid. The hint's text and its fill are then in
 *   pounds too, like the fields they fill.
 * - Order: when more (or fewer) sets came before it today than last time, for the same muscles
 *   above all but for any muscle a little (fatigue.ts), last time's reps are moved by the estimate
 *   before anything is decided, so it holds the weight where it would have jumped, or jumps where
 *   it would have held, and says why. Less than half a rep either way changes nothing. How rested
 *   its muscles are counts the same way (the work they got in the two days before, fatigue.ts).
 * - Effort: the last set's "reps left" from last time (effort.ts). Three or more left counts as two
 *   more reps on every set, so it jumps sooner or aims higher (people guess about one rep too few:
 *   Halperin et al. 2022); nothing left while still under the range means the weight is too heavy,
 *   and it steps down at once instead of waiting for the plateau rule.
 * - Today's sets: once a set ticked today comes in short of its aim, the aims for the rest come
 *   down by the same share (what autoregulated training does: Zhang et al. 2021).
 * - Rest: reps that fell off steeply from set to set on a short rest timer get a line about
 *   resting longer (ACSM 2009: at least 2–3 min for the big lifts, 1–2 for the others).
 * - Nothing logged yet: a first weight from the lifter's related lifts (startWeight.ts).
 *
 * Sources: ACSM's progression models (2009: "2–10% (lower percent for small muscle mass
 * exercises, higher percent increase for large muscle mass exercises) increase in load" once the
 * current one is done "for one to two repetitions over the desired number"); Plotkin et al. 2022 (adding reps and
 * adding load build muscle and strength about equally); detraining reviews (strength holds for
 * 3–4 weeks off, then falls roughly 5–15% over 4–8 weeks). The plateau reset (take 10% off
 * after three flat sessions) is coaching practice, not a trial result.
 */

/** In the block's unit, like the weight fields it's written into. */
export interface HintFill {
  /** Weight for the sets that are empty or still at `from`. */
  weight?: number
  from?: number
  /** Reps by set position (the last one repeats). */
  reps?: number[]
}

export interface ProgressHint {
  /** `hold`: today's order means matching last time (or less) is the aim. `start`: nothing logged yet (startWeight.ts). */
  kind: 'weight' | 'reps' | 'hold' | 'ease' | 'reset' | 'start'
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
  /** The unit the exercise is logged in; history (`lastSets`, `trend`) is kg either way. */
  unit?: WeightUnit
  /** What came before it today against last time (fatigue.ts `orderEffect`). */
  order?: OrderEffect
  /** The block's own sets today, in its unit: the ones ticked so far re-aim the rest. */
  sets?: Pick<SetDraft, 'weight' | 'reps' | 'done'>[]
  /** What the block's rest timer is set to, in seconds. */
  restSec?: number
}

/** Same cap as the rank scoring: past this, Epley measures endurance. */
const MAX_REPS = 20
const EXTRA_REPS = 5
/** The most a weight goes up at once when more than one step is due (ACSM: 2–10%). */
const MAX_JUMP = 0.1
/** Reps counted on top of last time's when its last set left three or more. */
const EASY_REPS = 2
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

/** Loaded with plates on a bar (the logger's plate calculator). */
export const isBarbell = (name: string) => gearOf(name.toLowerCase()) === 'barbell'

/** The usual smallest jump on this equipment, until the lifter's own history shows the real one. */
function defaultStep(gear: Gear, name: string, weight: number, lb: boolean): number {
  const heavy = weight >= (lb ? 225 : 100) && /deadlift|squat|hip thrust|rack pull/.test(name)
  switch (gear) {
    case 'dumbbell': return lb ? (weight < 25 ? 2.5 : 5) : weight < 10 ? 1 : 2.5
    case 'kettlebell': return lb ? 9 : 4
    case 'machine': return lb ? 10 : 5
    case 'barbell': return heavy ? (lb ? 10 : 5) : lb ? 5 : 2.5
    default: return lb ? 5 : 2.5
  }
}

function defaultTarget(name: string, gear: Gear): number {
  if (SMALL.test(name)) return 15
  if (SINGLE_JOINT.test(name)) return 12
  return gear === 'barbell' ? 8 : 10
}

/** By its name: the usual smallest jump for an exercise at a weight, and its usual rep target (startWeight.ts). */
export const stepFor = (name: string, weight: number, lb: boolean) => defaultStep(gearOf(name.toLowerCase()), name.toLowerCase(), weight, lb)
export const targetFor = (name: string) => defaultTarget(name.toLowerCase(), gearOf(name.toLowerCase()))

const round = (n: number) => Math.round(n * 100) / 100
const kg = (n: number) => String(round(n))
/** Pound targets land on what can be loaded: the 2.5 lb grid, unless that would lose the jump. */
const loadable = (n: number, from: number, lb: boolean) => {
  const snapped = lb ? Math.round(n / 2.5) * 2.5 : round(n)
  return snapped === from ? round(n) : snapped
}
const list = (reps: number[]) => reps.join(' · ')
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const weeksSince = (days: number) => `${Math.round(days / 7)} weeks`

/**
 * Last time's reps moved to what today's order should allow, and the sentence saying so; the
 * reps as they were, and no sentence, when that's less than half a rep.
 */
function orderShift(reps: number[], order: OrderEffect | undefined): { expect: number[]; note: string } {
  const shift = order ? (sum(reps) / reps.length) * (order.ratio - 1) : 0
  if (!order || Math.abs(shift) < 0.5) return { expect: reps, note: '' }
  const n = Math.round(Math.abs(shift))
  const count = `${n} rep${n === 1 ? '' : 's'}`
  const names = (xs: string[]) => xs.slice(0, 2).join(' and ')
  const { before, rested } = order
  // Mostly how rested its muscles are: name the workouts of the days before. Mostly the number of
  // sets before it, whatever they worked: count them. Else name what tired its muscles today.
  const note = shift < 0
    ? rested
      ? ` After ${names(rested.today)} in the last two days, expect about ${count} fewer than last time.`
      : before
        ? ` After ${before.today} earlier sets today (${before.last} last time), expect about ${count} fewer.`
        : ` After ${names(order.today)} today, expect about ${count} fewer than last time.`
    : rested
      ? ` More rested than last time${rested.last.length ? ` (it came within two days of ${names(rested.last)} then)` : ''}, so expect about ${count} more.`
      : before
        ? ` Fresher than last time (${before.last} earlier sets then, ${before.today} today), so expect about ${count} more.`
        : ` Fresher than last time${order.last.length ? ` (it came after ${names(order.last)} then)` : ''}, so expect about ${count} more.`
  return { expect: reps.map(r => r * order.ratio), note }
}

/**
 * Last time's reps as today should allow them: moved by the order, and counted for more where the
 * last set left three or more in the tank. `left` goes after last time's numbers wherever they're named.
 */
function expected(reps: number[], order: OrderEffect | undefined, effort: Effort | undefined): { expect: number[]; note: string; left: string } {
  const { expect, note } = orderShift(reps, order)
  if (effort !== 'easy') return { expect, note, left: '' }
  return { expect: expect.map(r => r + EASY_REPS), note, left: ' with 3+ reps left' }
}

/**
 * The aims for the sets still to do, once the ones ticked today (at `weight`, when there is one)
 * came in short of theirs: brought down by the same share, since today's sets say more about
 * today than last time's did. Null when nothing is ticked, nothing is left to do, or it's less
 * than a rep short in all.
 */
function reAim(goals: number[], today: ProgressInput['sets'], weight?: number): { goals: number[]; rest: number[]; note: string } | null {
  if (!today?.some(s => !s.done)) return null
  const aim = (i: number) => goals[Math.min(i, goals.length - 1)]
  const done = today.flatMap((s, i) => (s.done && Number(s.reps) > 0 && (weight == null || Number(s.weight) === weight) ? [{ i, reps: Number(s.reps) }] : []))
  const got = sum(done.map(d => d.reps))
  const aimed = sum(done.map(d => aim(d.i)))
  if (done.length === 0 || aimed - got < 1) return null
  const next = today.map((s, i) => (s.done ? aim(i) : Math.max(1, Math.round((aim(i) * got) / aimed))))
  const which = done.length === 1 ? `set ${done[0].i + 1} came in` : `${done.length} sets came in`
  return { goals: next, rest: next.filter((_, i) => !today[i].done), note: `${which} ${aimed - got} under` }
}

/** A short rest costs the later sets their reps: said when they fell off steeply on a rest timer under what ACSM gives. */
function restNote(work: number[], restSec: number | undefined, compound: boolean): string {
  const lost = work[0] - work[work.length - 1]
  if (!restSec || restSec >= (compound ? 120 : 60) || lost < 3 || lost < work[0] * 0.3) return ''
  return ` Your reps fell off from set to set: ${compound ? '2–3' : '1–2'} min of rest instead of ${restSec} s would keep more of them.`
}

/** Reps to aim for: one more where the expected reps are short of `need`. */
const goalsFrom = (expect: number[], need: number) => expect.map(r => (Math.round(r) >= need ? Math.round(r) : Math.round(r) + 1))

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

export function suggestProgress({ exercise, lastSets, trend, targetReps, bodyKg, unit, order, sets: today, restSec }: ProgressInput): ProgressHint | null {
  if (setModeFor(exercise) !== 'load') return null
  // From here on every weight is in the unit the exercise is logged in
  const lb = isLb(unit)
  const u = lb ? 'lb' : 'kg'
  const sets = (lastSetsIn(lastSets, unit) ?? []).filter(s => (s.reps ?? 0) > 0)
  if (sets.length === 0) return null

  const name = exercise.name.toLowerCase()
  const std = standardFor(exercise.uuid)
  const assisted = (std?.kind === 'reps' && !!std.assisted) || name.includes('assisted')
  const gapDays = trend?.gapDays ?? 0
  // How many reps the last set left, when that was said
  const effort = effortFromRpe(sets[sets.length - 1].rpe)
  const compound = !SMALL.test(name) && !SINGLE_JOINT.test(name)
  const weights = sets.flatMap(s => ((s.weight ?? 0) > 0 ? [s.weight ?? 0] : []))
  if (weights.length === 0) {
    const reps = sets.map(s => s.reps ?? 0)
    return bodyweightHint({ reps, target: targetReps ?? (HARD_BODYWEIGHT.test(name) ? 12 : MAX_REPS), gapDays, assisted, order, effort, today, rest: restNote(reps, restSec, compound) })
  }

  // The working weight: the heaviest of the session (with assistance, the least help)
  const top = assisted ? Math.min(...weights) : Math.max(...weights)
  const work = sets.filter(s => s.weight === top).map(s => s.reps ?? 0)
  const straight = sets.every(s => s.weight === top)
  const least = Math.min(...work)
  const every = work.length > 1 ? ' on every set' : ''
  // What today's place in the workout, and how last time felt, should allow at that weight
  const { expect, note, left } = expected(work, order, effort)
  const likely = Math.min(...expect)

  // Bodyweight moves lift part of the body too, so a small plate is a small jump
  const bodyWeight = fromKg(resolveBodyKg(bodyKg), unit)
  const body = std?.kind === 'reps' ? bodyWeight * std.bodyShare : exercise.type === 'bodyweight' ? bodyWeight : 0
  const moved = (w: number) => (assisted ? Math.max(1, body - w) : body + w)
  const gear = gearOf(name)
  const usual = assisted ? (lb ? 10 : 5) : body > 0 ? (lb ? 5 : 2.5) : defaultStep(gear, name, top, lb)
  const own = trend?.step ? stepFromKg(trend.step, unit) : 0
  const step = own > 0 && own <= usual * 2 ? own : usual
  const stepsFor = (share: number) => Math.max(1, Math.round((moved(top) * share) / step)) * step
  const next = assisted ? Math.max(0, loadable(top - step, top, lb)) : loadable(top + step, top, lb)

  const target = Math.max(1, Math.round(targetReps ?? defaultTarget(name, gear)))
  const low = Math.max(1, target - (target >= 15 ? 4 : target >= 11 ? 3 : 2))
  const most = Math.max(target, Math.min(MAX_REPS, target + EXTRA_REPS))
  /** Reps to expect at `weight` from `reps` done at the working weight. */
  const repsWith = (weight: number, reps: number) => Math.round(repsAt(moved(top), reps, moved(weight)))
  const after = (reps: number) => repsWith(next, reps)
  let need = target
  while (need < most && after(need) < low) need++

  if (gapDays >= EASE_AFTER_DAYS) {
    const percent = gapDays >= LONG_BREAK_DAYS ? 15 : 10
    const eased = assisted ? loadable(top + stepsFor(percent / 100), top, lb) : Math.max(0, loadable(top - stepsFor(percent / 100), top, lb))
    return {
      kind: 'ease',
      title: eased > 0 ? `Ease back in at ${kg(eased)} ${u}` : 'Ease back in at bodyweight',
      why: `${weeksSince(gapDays)} since you last did this. Start about ${percent}% ${assisted ? 'easier' : 'lighter'}, match last time’s reps (${list(work)}), then build back up.`,
      fill: eased > 0 ? { weight: eased, from: top } : undefined,
    }
  }

  if (likely >= need) {
    // So far past the target that one step leaves the reps at or over it: take another, while the
    // reps stay in the range and the load within what ACSM allows at once
    const limit = moved(top) * (SMALL.test(name) || SINGLE_JOINT.test(name) ? 1 + MAX_JUMP / 2 : 1 + MAX_JUMP)
    let to = next
    for (let w = loadable(to + step, top, lb); !assisted && repsWith(to, likely) >= target && repsWith(w, likely) >= low && moved(w) <= limit; w = loadable(w + step, top, lb)) to = w
    const big = after(likely) < low
    const at = `${kg(top)} ${u}${assisted ? ' of assistance' : ''}`
    const got = to !== next
      ? `Last time ${list(work)} at ${at}${left}, well past ${target}, so it’s a bigger step than usual.`
      : least >= need ? `You got ${need}${work.some(r => r > need) ? '+' : ''} reps${every} at ${at}${left}.` : `Last time ${list(work)} at ${at}${left}.`
    return {
      kind: 'weight',
      title: !assisted ? `Go up to ${kg(to)} ${u}` : next > 0 ? `Take some help off: ${kg(next)} ${u}` : 'Try it without assistance',
      why: `${got}${note} ${big ? 'It’s a big jump, so fewer reps at first is fine.' : `Aim for ${low}–${target} reps.`}`,
      fill: to > 0 ? { weight: to, from: top } : undefined,
    }
  }

  // Nothing left and still under the range: the weight is too heavy for now, and a step down
  // beats grinding at it until the plateau rule notices
  const best = Math.max(...work)
  if (effort === 'hard' && !assisted && best < low) {
    let down = loadable(top - step, top, lb)
    while (down - step > 0 && repsWith(down, best) < low) down = loadable(down - step, top, lb)
    if (down > 0) {
      return {
        kind: 'reset',
        title: `Drop to ${kg(down)} ${u}`,
        why: `Last time ${list(work)} at ${kg(top)} ${u} took all you had and is under ${low}–${target} reps. A weight you can take through that range builds more.`,
        fill: { weight: down, from: top },
      }
    }
  }

  const reset = loadable(top - stepsFor(0.1), top, lb)
  if (!assisted && (trend?.flat ?? 0) >= FLAT_SESSIONS && reset > 0) {
    return {
      kind: 'reset',
      title: `Try a reset at ${kg(reset)} ${u}`,
      why: `${trend?.flat} sessions at ${kg(top)} ${u} without more reps. Taking about 10% off and building back up usually gets past a plateau.`,
      fill: { weight: reset, from: top },
    }
  }

  const goals = goalsFrom(expect, need)
  // Sets ticked today that came in short of their aim bring the aims for the rest down with them
  const plan = straight ? reAim(goals, today, top) : null
  const aims = plan?.goals ?? goals
  // After more related work than last time, or a short set today, the aim can be last time's reps or fewer: no "add reps" then
  const adding = aims.some((g, i) => !(plan && today?.[i]?.done) && g > work[Math.min(i, work.length - 1)])
  const then = !assisted ? `go up to ${kg(next)} ${u}` : next > 0 ? `drop to ${kg(next)} ${u} of assistance` : 'try it without assistance'
  // Past the usual target: say why, or the number reads like a mistake
  const heavier = Math.round((moved(next) / moved(top) - 1) * 100)
  const when = need <= target
    ? `At ${need}${every}, ${then}.`
    : assisted
      ? `Less help is a big step, so build to ${need}${every}, then ${then}.`
      : `${kg(next)} ${u} is ${heavier}% heavier, so build to ${need}${every} first.`
  return {
    kind: adding ? 'reps' : 'hold',
    title: `${assisted ? 'Same assistance' : `Stay at ${kg(top)} ${u}`}${adding ? ', add reps' : ''}`,
    why: `${plan ? `Aim for ${list(plan.rest)} on the rest: ${plan.note}.` : `Aim for ${list(goals)} (last time ${list(work)}${left}).${note}`} ${when}${restNote(work, restSec, compound)}`,
    fill: straight ? { weight: top, from: top, reps: aims } : undefined,
  }
}

interface BodyweightInput {
  reps: number[]
  target: number
  gapDays: number
  assisted: boolean
  order?: OrderEffect
  effort?: Effort
  today?: ProgressInput['sets']
  /** The line about resting longer, when it applies (restNote). */
  rest: string
}

/** Reps-only sets: add a rep until every set reaches the target, then make the move harder. */
function bodyweightHint({ reps, target: targetReps, gapDays, assisted, order, effort, today, rest }: BodyweightInput): ProgressHint {
  const target = Math.max(1, Math.round(targetReps))
  const every = reps.length > 1 ? ' on every set' : ''
  const { expect, note, left } = expected(reps, order, effort)
  const harder = assisted ? 'use less assistance' : 'add a little weight or try a harder variation'
  if (gapDays >= EASE_AFTER_DAYS) {
    return {
      kind: 'ease',
      title: 'Ease back in',
      why: `${weeksSince(gapDays)} since you last did this. Match last time (${list(reps)}) before pushing on.`,
      fill: { reps },
    }
  }
  if (Math.min(...expect) >= target) {
    return {
      kind: 'weight',
      title: assisted ? 'Use less assistance' : 'Time to make it harder',
      why: `${Math.min(...reps) >= target ? `You got ${target}${reps.some(r => r > target) ? '+' : ''} reps${every}${left}.` : `Last time ${list(reps)}${left}.`}${note} Next, ${harder}.`,
    }
  }
  const goals = goalsFrom(expect, target)
  const plan = reAim(goals, today)
  const aims = plan?.goals ?? goals
  const adding = aims.some((g, i) => !(plan && today?.[i]?.done) && g > reps[Math.min(i, reps.length - 1)])
  return {
    kind: adding ? 'reps' : 'hold',
    title: adding ? 'Add a rep' : plan ? 'Match today’s pace' : 'Match last time',
    why: `${plan ? `Aim for ${list(plan.rest)} on the rest: ${plan.note}.` : `Aim for ${list(goals)} (last time ${list(reps)}${left}).${note}`} At ${target}${every}, ${harder}.${rest}`,
    fill: { reps: aims },
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
