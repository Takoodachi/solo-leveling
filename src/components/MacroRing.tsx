import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

const RADIUS = 52
const STROKE = 10
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const SIZE = (RADIUS + STROKE) * 2

interface Props {
  consumed: number
  target: number
  className?: string
}

export default function MacroRing({ consumed, target, className }: Props) {
  const percent = target > 0 ? Math.min(1, consumed / target) : 0
  const filled = percent * CIRCUMFERENCE
  const isOver = target > 0 && consumed > target

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={STROKE}
        />
        {/* Fill */}
        {percent > 0 && (
          <motion.circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={isOver ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'}
            strokeWidth={STROKE}
            strokeLinecap="round"
            initial={{ strokeDasharray: `0 ${CIRCUMFERENCE}` }}
            animate={{ strokeDasharray: `${filled} ${CIRCUMFERENCE}` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        )}
      </svg>
      {/* Center text */}
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-bold leading-none">{Math.round(consumed)}</span>
        <span className="text-xs text-muted-foreground">cal</span>
      </div>
    </div>
  )
}
