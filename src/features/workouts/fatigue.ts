import type { Exercise } from '@/types'
import { sharesOf } from './musclesWorked'
import type { BlockDraft, Preload, Recent } from './types'

/**
 * What came before an exercise in a workout, and what that does to its reps (the tips,
 * progression.ts). An exercise done later gets fewer reps; how many fewer follows what the sets
 * before it worked:
 * - The same muscles: about 5% fewer reps per set already done for the same main muscle, a
 *   helper's share through a helper muscle (front delts tired by a chest press, before a shoulder
 *   press). The order studies agree on the direction (Simão et al. 2012, Sports Medicine: more
 *   reps for an exercise placed first, big muscle or small; ACSM 2009: lifts decline "after several
 *   exercises stressing similar muscle groups") and give its size: 15% fewer leg press reps after
 *   a set of leg extensions to failure (Augustsson et al. 2003), 22% fewer squat reps after leg
 *   extensions and curls (Sforzo & Touey 1996).
 * - Any other muscle: a little, about 1% per set and at most 10%. Tiring one muscle hardly lowers
 *   another's strength, but it does cut how long the other lasts, which is what reps at a weight
 *   measure (Behm et al. 2021, a meta-analysis of non-local fatigue: trivial for strength and
 *   power, a moderate loss for endurance). A squat done after 21 sets for the whole body lost 2.6
 *   of its 8 reps (Spreuwenberg et al. 2006).
 * In all at most 25%.
 *
 * The days before count too: muscles worked in the last two days aren't back to full yet. Sets
 * taken to failure hold a lift back for 24 to 48 hours (Morán-Navarro et al. 2017), and it takes
 * about 48 hours to perform as before (Goulart et al. 2021). So the work its muscles got in the
 * two days before today is weighed against the same before last time: about 1% of the reps per
 * set from the last day, half that from the day before, at most 15%.
 */

const LOST_PER_SET = 0.05
const LOST_PER_OTHER_SET = 0.01
const MAX_LOST_OTHER = 0.1
const MAX_LOST = 0.25
const LOST_PER_RECENT_SET = 0.01
const MAX_LOST_RECENT = 0.15
/** As on the muscles-worked map: a cardio entry weighs like a set per ten minutes, within reason. */
const CARDIO_MINUTES_PER_SET = 10
const CARDIO_MAX_SETS = 6

/** How today's order moves the reps to expect against last time's (progression.ts). */
export interface OrderEffect {
  /** Share of last time's reps to expect: below 1 after more work than last time, above after less. */
  ratio: number
  /** The exercises before it today and last time that worked its muscles, most first. */
  today: string[]
  last: string[]
  /** Sets before it today and last time, whatever the muscle: given when that count, not the muscles' work, is what moves the reps most. */
  before?: { today: number; last: number }
  /** The workouts that worked its muscles in the two days before, today and last time: given when how rested they are is what moves the reps most. */
  rested?: { today: string[]; last: string[] }
}

type Load = Pick<Preload, 'sets' | 'total'>

/** How much a set of `before` works the muscles `ex` needs: 1 sharing a main muscle, ½ through a helper, ¼ helper to helper. */
export function overlap(ex: Exercise, before: Exercise): number {
  const theirs = sharesOf(before)
  let most = 0
  for (const [region, share] of sharesOf(ex)) most = Math.max(most, share * (theirs.get(region) ?? 0))
  return most
}

/** Sets' worth of work, from the durations of what was done (cardio entries count by their minutes). */
export function workDone(exercise: Exercise, durations: number[]): number {
  if (exercise.type !== 'cardio') return durations.length
  return durations.reduce((sum, minutes) => sum + Math.min(CARDIO_MAX_SETS, Math.max(1, minutes / CARDIO_MINUTES_PER_SET)), 0)
}

/** What the earlier exercises (each with its sets' worth of work) put on `ex`: on its muscles, and in all. */
export function preload(ex: Exercise, earlier: { exercise: Exercise; sets: number }[]): Preload {
  const by = new Map<string, number>()
  let total = 0
  for (const e of earlier) {
    if (e.exercise.uuid === ex.uuid) continue
    total += e.sets
    const load = e.sets * overlap(ex, e.exercise)
    if (load > 0) by.set(e.exercise.name, (by.get(e.exercise.name) ?? 0) + load)
  }
  return {
    sets: [...by.values()].reduce((a, b) => a + b, 0),
    after: [...by].sort((a, b) => b[1] - a[1]).map(([name]) => name),
    total,
  }
}

/** The share of the reps lost to the work on the same muscles, and to everything else that came before. */
const toMuscles = (p: Load) => p.sets * LOST_PER_SET
const toTheRest = (p: Load) => Math.min(MAX_LOST_OTHER, Math.max(0, (p.total ?? p.sets) - p.sets) * LOST_PER_OTHER_SET)

/** Last time's reps × this = what today's order is likely to allow. */
export function repRatio(today: Load, last: Load): number {
  const kept = (p: Load) => 1 - Math.min(MAX_LOST, toMuscles(p) + toTheRest(p))
  return kept(today) / kept(last)
}

/** The share of the reps lost to work the same muscles got in the two days before. */
const toTheDaysBefore = (r: Recent) => Math.min(MAX_LOST_RECENT, r.sets * LOST_PER_RECENT_SET)

/** Last time's reps × this = what the muscles' rest since their last work is likely to allow. */
export function restedRatio(today: Recent, last: Recent): number {
  return (1 - toTheDaysBefore(today)) / (1 - toTheDaysBefore(last))
}

const NOTHING: Preload = { sets: 0, after: [] }
const NO_WORK: Recent = { sets: 0, after: [] }

/**
 * For the exercise at `idx`: what's been done before it today (every set ticked in another
 * exercise so far, whatever its place) and in the two days before, against the same last time.
 * Unknown for a card made before either was kept (an older draft): then nothing is adjusted.
 */
export function orderEffect(blocks: BlockDraft[], idx: number): OrderEffect | undefined {
  const block = blocks[idx]
  if (!block || (!block.lastPreload && !block.recovery)) return undefined
  const last = block.lastPreload ?? NOTHING
  const all = block.lastPreload
    ? preload(block.exercise, blocks.flatMap((b, i) => {
        const done = i === idx ? [] : b.sets.filter(s => s.done)
        return done.length ? [{ exercise: b.exercise, sets: workDone(b.exercise, done.map(s => Number(s.duration) || 0)) }] : []
      }))
    : NOTHING
  // A card from before every set was counted: only the muscles' work can be compared
  const today: Preload = last.total == null ? { sets: all.sets, after: all.after } : all
  const days = block.recovery ?? { today: NO_WORK, last: NO_WORK }
  const effect: OrderEffect = { ratio: repRatio(today, last) * restedRatio(days.today, days.last), today: today.after, last: last.after }
  // The tip says what moved the reps most: the same muscles' work today, how much came before in all, or the days before
  const byMuscles = Math.abs(toMuscles(today) - toMuscles(last))
  const byCount = Math.abs(toTheRest(today) - toTheRest(last))
  const byDays = Math.abs(toTheDaysBefore(days.today) - toTheDaysBefore(days.last))
  if (byDays > byMuscles && byDays > byCount) return { ...effect, rested: { today: days.today.after, last: days.last.after } }
  return byCount > byMuscles ? { ...effect, before: { today: Math.round(today.total ?? 0), last: Math.round(last.total ?? 0) } } : effect
}
