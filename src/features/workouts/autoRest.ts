import type { Exercise } from '@/types'
import { setModeFor } from '@/lib/workoutMath'
import { extraOn } from '@/features/settings/extras'
import { liftKind, type LiftKind } from './progression'
import type { BlockDraft } from './types'
import { addRestSeconds, restEndsAt } from './hooks/useRestTimer'
import { REST_PAUSE_SECONDS } from './setKinds'

/**
 * Auto rest (Settings → Extras, on by default; November 2026, at the owner's request): the rest after
 * a set is picked from the movement and from how hard the set was, in place of one fixed time per
 * exercise. The times saved in routines aren't used while it's on.
 *
 * By the movement, classed by its name as the tips class it (progression.ts `liftKind`): 2:30 after a
 * heavy barbell lift, 2:00 after another compound, 1:30 after a single-joint lift, 1:00 after a
 * small-muscle one or a timed hold. ACSM's 2009 position stand: 2–3 min between sets of the main
 * lifts at heavy loads, 1–2 min for the others; Schoenfeld 2016: 3 min between sets built more muscle
 * and strength than 1 min; Grgic 2017 (a review): at least 2 min for multi-joint lifts, while 60–90 s
 * can be enough for single-joint ones.
 * By the set: 30 s more after one taken to failure, which takes longer to recover from
 * (Morán-Navarro 2017).
 * Stretches keep their own rest (their hold timer paces them), and cardio has none.
 */
export interface RestPick {
  seconds: number
  /** Why it's that long, for the rest bar ("Heavy lift · failure"); empty for a fixed time. */
  why: string
}

const BY_KIND: Record<LiftKind, [number, string]> = {
  heavy: [150, 'Heavy lift'],
  compound: [120, 'Compound'],
  single: [90, 'Isolation'],
  small: [60, 'Small lift'],
}
/** A plank or a wall sit. */
const HOLD: [number, string] = [60, 'Hold']
/** Added after a set taken to failure. */
export const FAILURE_EXTRA = 30

type Movement = Pick<Exercise, 'name' | 'type' | 'defaultUnit'>

/** Auto rest's pick after a set of this exercise; null where it doesn't pick (a stretch, cardio). */
export function autoRest(exercise: Movement, failure = false): RestPick | null {
  const mode = setModeFor(exercise)
  if (mode === 'stretch' || mode === 'cardio') return null
  const [seconds, label] = mode === 'time' ? HOLD : BY_KIND[liftKind(exercise.name)]
  return failure ? { seconds: seconds + FAILURE_EXTRA, why: `${label} · failure` } : { seconds, why: label }
}

/**
 * The rest to start once the set at `setIdx` is ticked (the phone's tick and the watch's Done):
 * Auto rest's pick while it's on, else the block's own time or the default. Null for none: a
 * stretch with no rest of its own goes straight on to the next hold, and so does a set that a drop
 * set or partials carry on (rest-pause gets its short pause). Those, on or off.
 */
export function restAfterSet(block: Pick<BlockDraft, 'exercise' | 'restSec' | 'sets'>, setIdx: number, defaultRest: number, auto = extraOn('autoRest')): RestPick | null {
  if (setModeFor(block.exercise) === 'stretch') return block.restSec > 0 ? { seconds: block.restSec, why: '' } : null
  const next = block.sets[setIdx + 1]
  if (next?.kind && !next.done) return next.kind === 'rest-pause' ? { seconds: REST_PAUSE_SECONDS, why: 'Rest-pause' } : null
  // The last row carrying a set on ends it at failure, as one marked to failure does
  const row = block.sets[setIdx]
  return (auto ? autoRest(block.exercise, !!row?.kind || !!row?.failure) : null) ?? { seconds: block.restSec || defaultRest, why: '' }
}

/** A set was marked as taken to failure, or unmarked, during its rest: the running rest grows or shrinks by the 30 s. */
export function restForFailure(exercise: Movement, failure: boolean, auto = extraOn('autoRest')): void {
  const pick = auto && restEndsAt() ? autoRest(exercise, failure) : null
  if (pick) addRestSeconds(failure ? FAILURE_EXTRA : -FAILURE_EXTRA, pick.why)
}
