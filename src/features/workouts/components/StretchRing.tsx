import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { StretchPhase } from '../hooks/useStretchSession'

const R = 88
const AROUND = 2 * Math.PI * R

interface Props {
  phase: StretchPhase
  /** The hold's length, shown before it starts. */
  seconds: number
  /** Under the number: "seconds", "Switch sides", "Paused"… */
  label: string
}

/**
 * A stretching session's big countdown: the seconds left, and a ring that empties as they go
 * (the accent while holding, muted during a break). It ticks in here, so it's this ring that is
 * drawn again five times a second and not the session around it.
 */
export default function StretchRing({ phase, seconds, label }: Props) {
  const running = phase.kind === 'hold' || phase.kind === 'break'
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!running) return
    const tick = () => setNow(Date.now())
    const id = setInterval(tick, 200)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [running])

  const total = running || phase.kind === 'paused' ? phase.total : seconds
  // `now` is the last tick, which can be from before this phase began: never more than its whole length
  const left = running ? Math.min(total, Math.max(0, (phase.endAt - now) / 1000)) : phase.kind === 'paused' ? phase.left / 1000 : total
  const gone = total > 0 ? 1 - left / total : 0
  const holding = phase.kind === 'hold' || (phase.kind === 'paused' && phase.of === 'hold')
  const shown = Math.ceil(left)

  return (
    <div role="timer" aria-label={`${shown} second${shown === 1 ? '' : 's'}${label === 'seconds' ? '' : `, ${label}`}`} className="relative mx-auto size-56">
      <svg viewBox="0 0 200 200" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="100" cy="100" r={R} fill="none" strokeWidth="12" className="stroke-foreground/10" />
        <circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={AROUND}
          strokeDashoffset={AROUND * gone}
          className={cn('transition-[stroke-dashoffset] duration-200 ease-linear', holding ? 'stroke-primary' : 'stroke-muted-foreground')}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-heading text-6xl font-bold tabular-nums">{shown}</span>
        <span className="mt-1 text-sm text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}
