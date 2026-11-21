import type { WorkoutDraft } from './types'
import { DEFAULT_HOLD_SECONDS } from './units'

/**
 * A session of nothing but stretches, played one hold at a time (StretchSession): the order of the
 * holds, the break between two, and what's left. A hold is one set of one stretch; `b` and `s` are
 * its block and set in the draft.
 */
export type HoldAt = { b: number; s: number }

type Blocks = Pick<WorkoutDraft, 'blocks'>

/** Getting to the other side of the same stretch is quick; getting into a new one takes longer. */
export const SWITCH_SECONDS = 5
export const NEXT_SECONDS = 10

const same = (a: HoldAt, b: HoldAt) => a.b === b.b && a.s === b.s

/** Every hold, in order. */
export function holdsOf(draft: Blocks): HoldAt[] {
  return draft.blocks.flatMap((block, b) => block.sets.map((_, s) => ({ b, s })))
}

/** The first hold after `at` (from the start, without one) that isn't done; null with none left. */
export function nextHold(draft: Blocks, at?: HoldAt | null): HoldAt | null {
  const all = holdsOf(draft)
  const from = at ? all.findIndex(h => same(h, at)) + 1 : 0
  return all.slice(from).find(h => !draft.blocks[h.b].sets[h.s].done) ?? null
}

/** The hold before `at`, done or not: Back goes there to hold it again. */
export function previousHold(draft: Blocks, at: HoldAt): HoldAt | null {
  const all = holdsOf(draft)
  const i = all.findIndex(h => same(h, at))
  return i > 0 ? all[i - 1] : null
}

/** A hold's length in seconds: its field, or the usual 30. */
export function holdLength(draft: Blocks, at: HoldAt): number {
  const seconds = Number(draft.blocks[at.b]?.sets[at.s]?.duration)
  return seconds > 0 ? seconds : DEFAULT_HOLD_SECONDS
}

/** The break from one hold to the next: the stretch's own rest when it has one. */
export function breakLength(draft: Blocks, from: HoldAt, to: HoldAt): number {
  const rest = draft.blocks[from.b]?.restSec ?? 0
  if (rest > 0) return rest
  return from.b === to.b ? SWITCH_SECONDS : NEXT_SECONDS
}

/** The holds not done yet from `at` on, with the breaks between them, in seconds. */
export function secondsLeft(draft: Blocks, at: HoldAt): number {
  const left = holdsOf(draft).filter((h, i, all) => i >= all.findIndex(x => same(x, at)) && !draft.blocks[h.b].sets[h.s].done)
  return left.reduce((sum, h, i) => sum + holdLength(draft, h) + (i > 0 ? breakLength(draft, left[i - 1], h) : 0), 0)
}
