import { cn } from '@/lib/utils'
import type { RankInfo } from '../tiers'

/** Progress through the current division, in the tier's color. */
export default function RankProgress({ rank, showLabel = true, className }: { rank: RankInfo; showLabel?: boolean; className?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, rank.progress)) * 100)
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${pct}%`, backgroundColor: rank.tier.color }} />
      </div>
      {showLabel && (
        <p className="text-xs text-muted-foreground tabular-nums">
          {rank.nextAt != null ? <>{rank.nextAt - rank.rating} pts to {rank.nextLabel}</> : 'Top of the ladder'}
        </p>
      )}
    </div>
  )
}
