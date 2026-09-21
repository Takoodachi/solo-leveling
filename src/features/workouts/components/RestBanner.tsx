import { AnimatePresence, motion } from 'framer-motion'
import { Timer } from 'lucide-react'
import { formatDuration } from '@/lib/format'

interface Props {
  secondsLeft: number | null
  totalSeconds: number
  onAdjust: (delta: number) => void
  onSkip: () => void
}

export default function RestBanner({ secondsLeft, totalSeconds, onAdjust, onSkip }: Props) {
  const visible = secondsLeft != null && secondsLeft > 0
  const pct = visible && totalSeconds > 0 ? secondsLeft / totalSeconds : 0

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
          role="timer"
          aria-live="polite"
        >
          <div className="mx-auto max-w-md overflow-hidden rounded-3xl border border-white/10 bg-popover/95 shadow-2xl backdrop-blur-xl">
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
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
