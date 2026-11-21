import { useEffect, useState } from 'react'
import { buzz, tap } from '@/lib/haptics'
import { chime, cue, unlockSound } from '@/lib/sound'
import { useWorkoutStore } from '../store'
import { breakLength, holdLength, nextHold, previousHold, type HoldAt } from '../stretchSession'
import { restEndsAt, stopRest } from './useRestTimer'

/** Where a stretching session is: not started, holding, between two holds, paused in one, or done. */
export type StretchPhase =
  | { kind: 'ready' }
  | { kind: 'hold' | 'break'; endAt: number; total: number }
  | { kind: 'paused'; of: 'hold' | 'break'; left: number; total: number }
  | { kind: 'done' }

// The clock is read when something starts or stops, never while the screen is drawn
const endsIn = (seconds: number) => Date.now() + seconds * 1000
const msUntil = (endAt: number) => Math.max(0, endAt - Date.now())

/**
 * A session of nothing but stretches, one hold at a time and hands-free: ▶ starts the first hold,
 * its end ticks the set (with a buzz and a chime), a short break follows (to switch sides, or get
 * into the next stretch) and the next hold starts by itself (with one note), to the last.
 */
export function useStretchSession() {
  const draft = useWorkoutStore(s => s.draft)
  const [at, setAt] = useState<HoldAt | null>(() => (draft ? nextHold(draft) : null))
  const [phase, setPhase] = useState<StretchPhase>(() => (at ? { kind: 'ready' } : { kind: 'done' }))
  const running = phase.kind === 'hold' || phase.kind === 'break'

  function hold(to: HoldAt) {
    const d = useWorkoutStore.getState().draft
    if (!d) return
    const total = holdLength(d, to)
    setAt(to)
    setPhase({ kind: 'hold', endAt: endsIn(total), total })
  }

  /** Move to `to`: straight into its hold while the session runs, otherwise waiting on it. */
  function go(to: HoldAt | null) {
    unlockSound()
    if (!to) return setPhase({ kind: 'done' })
    if (running) return hold(to)
    setAt(to)
    setPhase({ kind: 'ready' })
  }

  /** The big button: start, pause, or go on. */
  function toggle() {
    unlockSound() // from this tap, so the session can be heard from here on
    if (phase.kind === 'ready' && at) {
      if (restEndsAt()) stopRest()
      tap()
      hold(at)
    } else if (phase.kind === 'hold' || phase.kind === 'break') {
      setPhase({ kind: 'paused', of: phase.kind, left: msUntil(phase.endAt), total: phase.total })
    } else if (phase.kind === 'paused') {
      setPhase({ kind: phase.of, endAt: endsIn(phase.left / 1000), total: phase.total })
    }
  }

  const store = () => useWorkoutStore.getState().draft
  const skip = () => {
    const d = store()
    go(d ? nextHold(d, at) : null)
  }
  const back = () => {
    const d = store()
    const prev = d && at ? previousHold(d, at) : null
    if (prev) go(prev)
  }
  /** A stretch picked from Up next: its first hold not done, or its first. */
  const jump = (b: number) => {
    const d = store()
    if (!d?.blocks[b]) return
    const s = d.blocks[b].sets.findIndex(set => !set.done)
    go({ b, s: Math.max(0, s) })
  }
  /** From "done", back to what's still to hold (skipped, or added since). */
  const resume = () => {
    const d = store()
    const next = d ? nextHold(d) : null
    if (next) {
      setAt(next)
      setPhase({ kind: 'ready' })
    }
  }

  // The end of a hold or a break, worked out from the draft as it is then
  useEffect(() => {
    if (phase.kind !== 'hold' && phase.kind !== 'break') return
    const timer = setTimeout(() => {
      const state = useWorkoutStore.getState()
      if (!state.draft || !at) return
      if (phase.kind === 'break') {
        cue()
        const total = holdLength(state.draft, at)
        setPhase({ kind: 'hold', endAt: endsIn(total), total })
        return
      }
      // The hold is over: tick its set, as the ✓ would (one done already, held again, stays done)
      if (state.draft.blocks[at.b]?.sets[at.s]?.done === false) state.toggleDone(at.b, at.s)
      buzz([200, 100, 200])
      chime()
      const after = useWorkoutStore.getState().draft
      const next = after ? nextHold(after, at) : null
      if (!after || !next) return setPhase({ kind: 'done' })
      const total = breakLength(after, at, next)
      setAt(next)
      setPhase({ kind: 'break', endAt: endsIn(total), total })
    }, msUntil(phase.endAt))
    return () => clearTimeout(timer)
  }, [phase, at])

  return { at, phase, toggle, skip, back, jump, resume }
}
