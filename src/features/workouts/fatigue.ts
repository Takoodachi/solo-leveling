import type { Exercise } from '@/types'
import { sharesOf } from './musclesWorked'
import type { BlockDraft, Preload } from './types'

/**
 * What came before an exercise in a workout, and what that does to its reps (the tips,
 * progression.ts). An exercise done after others that worked the same muscles gets fewer reps:
 * the order studies agree on that (Simão et al. 2012, Sports Medicine: more reps and volume for
 * an exercise placed first, big muscle or small) though not on how many, so the estimate is
 * modest: about 5% fewer reps per set already done for the same main muscle, a helper's share
 * through a helper muscle (front delts tired by a chest press, before a shoulder press), at most 25%.
 */

const LOST_PER_SET = 0.05
const MAX_LOST = 0.25
/** As on the muscles-worked map: a cardio entry weighs like a set per ten minutes, within reason. */
const CARDIO_MINUTES_PER_SET = 10
const CARDIO_MAX_SETS = 6

/** How today's order moves the reps to expect against last time's (progression.ts). */
export interface OrderEffect {
  /** Share of last time's reps to expect: below 1 after more related work than last time, above after less. */
  ratio: number
  /** The exercises before it today and last time that worked its muscles, most first. */
  today: string[]
  last: string[]
}

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

/** What the earlier exercises (each with its sets' worth of work) put on `ex`'s muscles. */
export function preload(ex: Exercise, earlier: { exercise: Exercise; sets: number }[]): Preload {
  const by = new Map<string, number>()
  for (const e of earlier) {
    if (e.exercise.uuid === ex.uuid) continue
    const load = e.sets * overlap(ex, e.exercise)
    if (load > 0) by.set(e.exercise.name, (by.get(e.exercise.name) ?? 0) + load)
  }
  return {
    sets: [...by.values()].reduce((a, b) => a + b, 0),
    after: [...by].sort((a, b) => b[1] - a[1]).map(([name]) => name),
  }
}

/** Last time's reps × this = what today's order is likely to allow. */
export function repRatio(today: number, last: number): number {
  const lost = (sets: number) => Math.min(MAX_LOST, sets * LOST_PER_SET)
  return (1 - lost(today)) / (1 - lost(last))
}

/**
 * For the exercise at `idx`: what's been done before it today (every set ticked in another
 * exercise so far, whatever its place) against what came before it last time. Unknown for a card
 * made before last time's order was kept (an older draft): then nothing is adjusted.
 */
export function orderEffect(blocks: BlockDraft[], idx: number): OrderEffect | undefined {
  const block = blocks[idx]
  const last = block?.lastPreload
  if (!block || !last) return undefined
  const today = preload(block.exercise, blocks.flatMap((b, i) => {
    const done = i === idx ? [] : b.sets.filter(s => s.done)
    return done.length ? [{ exercise: b.exercise, sets: workDone(b.exercise, done.map(s => Number(s.duration) || 0)) }] : []
  }))
  return { ratio: repRatio(today.sets, last.sets), today: today.after, last: last.after }
}
