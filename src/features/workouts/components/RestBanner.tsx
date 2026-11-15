import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Timer } from 'lucide-react'
import { formatDuration } from '@/lib/format'
import type { Edge } from '../workoutLayout'

interface Props {
  /** When the running rest ends; null with none running. */
  endAt: number | null
  totalSeconds: number
  onAdjust: (delta: number) => void
  onSkip: () => void
  /** Where the page put it (workoutLayout.ts): it slides in from that edge. */
  edge: Edge
}

/** The rest countdown as a floating card; the workout screen places it under its header or at the bottom. */
export default function RestBanner({ endAt, totalSeconds, onAdjust, onSkip, edge }: Props) {
  // The countdown ticks in here, so it's this card that is drawn again four times a second and
  // not the workout screen around it. Derived from endAt, so a throttled or hidden tab catches up at once.
  const [now, setNow] = useState(() => Date.now())
  const running = endAt != null
  useEffect(() => {
    if (!running) return
    const tick = () => setNow(Date.now())
    const id = setInterval(tick, 250)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [running])
  // `now` is the last tick, which can be from before this rest began: never earlier than its start
  const secondsLeft = endAt == null ? null : Math.max(0, Math.ceil((endAt - Math.max(now, endAt - totalSeconds * 1000)) / 1000))
  const visible = secondsLeft != null && secondsLeft > 0
  const pct = visible && totalSeconds > 0 ? secondsLeft / totalSeconds : 0
  const away = edge === 'top' ? -24 : 120

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: away, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: away, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="pointer-events-auto mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-foreground/10 bg-popover/95 shadow-2xl backdrop-blur-xl"
          role="timer"
          aria-live="polite"
        >
          <div className="h-1 bg-secondary">
            <div className="h-full bg-primary transition-[width] duration-300 ease-linear" style={{ width: `${pct * 100}%` }} />
          </div>
          <div className="flex items-center gap-3 p-3">
            <Timer size={20} className="ml-1 text-primary" />
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Rest</p>
              <p className="font-heading text-2xl font-bold tabular-nums leading-none">{formatDuration(secondsLeft)}</p>
            </div>
            <button type="button" onClick={() => onAdjust(-15)} className="h-10 rounded-full bg-secondary px-3 text-sm font-semibold">−15</button>
            <button type="button" onClick={() => onAdjust(15)} className="h-10 rounded-full bg-secondary px-3 text-sm font-semibold">+15</button>
            <button type="button" onClick={onSkip} className="h-10 rounded-full bg-foreground px-4 text-sm font-semibold text-background">Skip</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
