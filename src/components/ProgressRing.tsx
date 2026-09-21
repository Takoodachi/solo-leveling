import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Props {
  /** 0–1 */
  value: number
  size?: number
  stroke?: number
  /** CSS color for the arc (defaults to the accent). */
  color?: string
  trackColor?: string
  className?: string
  children?: ReactNode
}

export default function ProgressRing({
  value,
  size = 88,
  stroke = 6,
  color = 'hsl(var(--primary))',
  trackColor = 'hsl(var(--secondary))',
  className,
  children,
}: Props) {
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, value))

  return (
    <div className={cn('relative inline-flex shrink-0 items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        {pct > 0 && (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            initial={{ strokeDasharray: `0 ${circumference}` }}
            animate={{ strokeDasharray: `${pct * circumference} ${circumference}` }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />
        )}
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  )
}
