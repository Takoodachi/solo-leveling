import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDuration } from '@/lib/format'

const SIZE = 80
const STROKE = 8
const RADIUS = (SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * RADIUS

interface Props {
  secondsLeft: number | null
  totalSeconds: number
  isRunning: boolean
  onAdd30: () => void
  onSkip: () => void
}

export default function RestBanner({ secondsLeft, totalSeconds, isRunning, onAdd30, onSkip }: Props) {
  return (
    <AnimatePresence>
      {isRunning && secondsLeft != null && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: 'tween', duration: 0.2 }}
          className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none flex justify-center px-3 pb-3"
        >
          <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-primary/30 bg-card/95 backdrop-blur-md shadow-2xl shadow-primary/10 p-3 flex items-center gap-4">
            <ProgressRing secondsLeft={secondsLeft} totalSeconds={totalSeconds} />
            <div className="flex-1 flex flex-col gap-2 min-w-0">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Rest</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 gap-1.5 h-10"
                  onClick={onAdd30}
                >
                  <Plus size={14} /> 30s
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="flex-1 gap-1.5 h-10"
                  onClick={onSkip}
                >
                  <X size={14} /> Skip
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ProgressRing({ secondsLeft, totalSeconds }: { secondsLeft: number; totalSeconds: number }) {
  const total = Math.max(1, totalSeconds)
  const elapsedFrac = Math.max(0, Math.min(1, (total - secondsLeft) / total))
  const dash = CIRC * elapsedFrac
  return (
    <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} className="-rotate-90">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={STROKE}
        />
        <motion.circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${CIRC}`}
          animate={{ strokeDasharray: `${dash} ${CIRC}` }}
          transition={{ duration: 0.3, ease: 'linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-mono font-bold text-2xl tabular-nums tracking-tight">
          {formatDuration(secondsLeft)}
        </span>
      </div>
    </div>
  )
}
