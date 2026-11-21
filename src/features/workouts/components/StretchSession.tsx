import { Check, Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import SectionHeader from '@/components/SectionHeader'
import type { Exercise } from '@/types'
import { useWorkoutStore } from '../store'
import { useStretchSession } from '../hooks/useStretchSession'
import { holdLength, nextHold, secondsLeft } from '../stretchSession'
import StretchRing from './StretchRing'

/** A stretch done one side at a time says so in its instructions ("Switch sides for the next set"). */
const ONE_SIDED = /\b(switch|swap) (sides|legs|arms|hands|the legs|which)\b/i

interface Props {
  onShowInfo: (exercise: Exercise) => void
  onFinish: () => void
}

/**
 * A workout of nothing but stretches, as a guided player (November 2026, the owner's pick): one
 * stretch at a time with a big countdown, its how-to on screen and what's next under it, running
 * hands-free from the first ▶ (useStretchSession), since the phone is often out of sight.
 */
export default function StretchSession({ onShowInfo, onFinish }: Props) {
  const draft = useWorkoutStore(s => s.draft)
  const { at, phase, toggle, skip, back, jump, resume } = useStretchSession()
  if (!draft) return null

  if (phase.kind === 'done' || !at || !draft.blocks[at.b]) {
    const skipped = nextHold(draft) != null
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl bg-card px-6 py-10 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary"><Check size={28} strokeWidth={2.5} /></span>
        <p className="text-lg font-semibold">{skipped ? 'That’s the end of the list' : 'All stretches done'}</p>
        <p className="text-sm text-muted-foreground">{skipped ? 'Some holds were skipped. Go back to them, or finish as it is.' : 'Finish to save the session.'}</p>
        <div className="mt-2 flex gap-2">
          {skipped && <Button variant="secondary" onClick={resume}>Go back to them</Button>}
          <Button onClick={onFinish}>Finish</Button>
        </div>
      </div>
    )
  }

  const block = draft.blocks[at.b]
  const sides = block.sets.length === 2 && ONE_SIDED.test(block.exercise.instructions ?? '')
  const breaking = phase.kind === 'break' || (phase.kind === 'paused' && phase.of === 'break')
  const label = phase.kind === 'paused' ? 'Paused' : breaking ? (at.s > 0 ? (sides ? 'Switch sides' : 'Next hold') : 'Get into position') : 'seconds'
  const playing = phase.kind === 'hold' || phase.kind === 'break'
  const minutes = Math.max(1, Math.round(secondsLeft(draft, at) / 60))
  const upNext = draft.blocks.flatMap((b, i) => (i > at.b ? [{ block: b, i }] : []))

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <p className="text-xs text-muted-foreground">Stretch {at.b + 1} of {draft.blocks.length} · about {minutes} min left</p>
        <button type="button" onClick={() => onShowInfo(block.exercise)} className="mt-2 font-heading text-2xl font-bold leading-tight">
          {block.exercise.name}
        </button>
        {block.sets.length > 1 && (
          <p className="mt-1 text-sm text-muted-foreground">{sides ? `Side ${at.s + 1} of 2` : `Hold ${at.s + 1} of ${block.sets.length}`}</p>
        )}
      </div>

      <StretchRing phase={phase} seconds={holdLength(draft, at)} label={label} />

      <div className="flex items-center justify-center gap-6">
        <button type="button" onClick={back} aria-label="Previous hold" className="press flex size-14 items-center justify-center rounded-full bg-secondary">
          <SkipBack size={22} className="fill-current" />
        </button>
        <button
          type="button"
          onClick={toggle}
          aria-label={phase.kind === 'ready' ? 'Start' : playing ? 'Pause' : 'Go on'}
          className="press flex size-20 items-center justify-center rounded-full bg-foreground text-background"
        >
          {playing ? <Pause size={32} className="fill-current" /> : <Play size={32} className="ml-1 fill-current" />}
        </button>
        <button type="button" onClick={skip} aria-label="Next hold" className="press flex size-14 items-center justify-center rounded-full bg-secondary">
          <SkipForward size={22} className="fill-current" />
        </button>
      </div>
      {phase.kind === 'ready' && (
        <p className="-mt-2 text-center text-xs text-muted-foreground">It chimes when a hold ends and starts the next one by itself.</p>
      )}

      {block.exercise.instructions && (
        <p className="rounded-3xl bg-card p-4 text-sm leading-relaxed text-muted-foreground">{block.exercise.instructions}</p>
      )}

      {upNext.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionHeader>Up next</SectionHeader>
          {upNext.map(({ block: b, i }) => (
            <button
              key={`${b.exercise.uuid}-${i}`}
              type="button"
              onClick={() => {
                jump(i)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 text-left"
            >
              <span className="truncate font-medium">{b.exercise.name}</span>
              <span className="shrink-0 text-sm text-muted-foreground">{holdLength(draft, { b: i, s: 0 })} s × {b.sets.length}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
