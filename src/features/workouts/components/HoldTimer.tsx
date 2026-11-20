import { useEffect, useState } from 'react'

interface Props {
  /** When the hold ends. */
  endAt: number
  /** How long it is, in seconds. */
  total: number
}

/**
 * A stretch's hold counting down in its set row, in place of its seconds field. It ticks in here,
 * so it's this cell that is drawn again four times a second and not the workout screen around it.
 * Derived from endAt, so a hidden tab catches up at once.
 */
export default function HoldTimer({ endAt, total }: Props) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const id = setInterval(tick, 250)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])
  const left = Math.max(0, Math.ceil((endAt - now) / 1000))
  const done = total > 0 ? Math.min(1, Math.max(0, 1 - (endAt - now) / (total * 1000))) : 1

  return (
    <div role="timer" aria-label={`${left} seconds left`} className="relative flex h-11 items-center justify-center overflow-hidden rounded-xl bg-secondary">
      {/* Scaled, not resized, so a tick doesn't lay the page out again */}
      <span className="absolute inset-0 origin-left bg-primary/25 transition-transform duration-300 ease-linear" style={{ transform: `scaleX(${done})` }} />
      <span className="relative text-base font-semibold tabular-nums text-primary">{left}s</span>
    </div>
  )
}
