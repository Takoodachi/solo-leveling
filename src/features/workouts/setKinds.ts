import type { SetKind } from '@/types'

/**
 * Drop sets, rest-pause and partials (November 2026, at the owner's request): a row that carries on
 * the set before it with no rest between, kept with its own weight and reps and its `kind` (the
 * synced column `workout_sets.kind`). The set it carries on and its rows are one set.
 * - Where sets are counted they count half a working set each (the set-volume radar, the body map,
 *   the earlier-sets count the tips weigh, XP): the owner's choice, since research on how to count
 *   them is thin.
 * - They never count toward an est. 1RM (bests, ranks, the strength chart, the tips, the PR line):
 *   a partial rep isn't a rep, and a drop or a rest-pause row after failure says little of strength.
 * - No rest before a drop set or partials, a short pause before rest-pause, and the rest after the
 *   last of them is the rest after a set to failure (autoRest.ts).
 * A set taken to failure is the existing "None" left (effort.ts: rpe 10), on any set.
 */
export const SET_KINDS: { kind: SetKind; label: string; hint: string }[] = [
  { kind: 'drop', label: 'Drop set', hint: 'Lighter, straight after' },
  { kind: 'rest-pause', label: 'Rest-pause', hint: 'Same weight, after a 15 s pause' },
  { kind: 'partials', label: 'Partials', hint: 'Partial reps after the full ones' },
]

export const kindLabel = (kind: SetKind): string => SET_KINDS.find(k => k.kind === kind)?.label ?? kind

/** How much of a working set a row that carries on another counts for. */
export const CARRY_ON_CREDIT = 0.5
/** The pause before a rest-pause row. */
export const REST_PAUSE_SECONDS = 15

/** An ordinary set: not a row carrying on another. */
export const isMainSet = (s: { kind?: SetKind | null }): boolean => !s.kind

/** Where the rows carrying on the set at `idx` end (the index past its last one); just past `idx` for a row that carries on another. */
export function chainEnd(sets: { kind?: SetKind | null }[], idx: number): number {
  if (sets[idx]?.kind) return idx + 1
  let end = idx + 1
  while (sets[end]?.kind) end++
  return end
}

/** The ordinary set a row belongs to: itself, or the nearest one before it. */
export function mainOf(sets: { kind?: SetKind | null }[], idx: number): number {
  let at = idx
  while (at > 0 && sets[at]?.kind) at--
  return at
}

/** The last ordinary set's index (-1 with none): the one the reps-left question is about. */
export function lastMain(sets: { kind?: SetKind | null }[]): number {
  for (let i = sets.length - 1; i >= 0; i--) if (!sets[i].kind) return i
  return -1
}
