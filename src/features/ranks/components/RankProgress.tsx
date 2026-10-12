import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { ink } from '@/lib/colors'
import { TIERS, tierSpan, type RankInfo } from '../tiers'

/** The colour `at` (0–1) of the way from one colour to another: a bar's tip, which moves on with the progress. */
const between = (from: string, to: string, at: number) => `color-mix(in srgb, ${from} ${Math.round((1 - at) * 100)}%, ${to})`

/** A fill for `.bar-fill` (index.css): faint in the rank's colour where it starts, `tip` where it has got to. */
const fill = (at: number, color: string, tip: string) =>
  ({ width: `${at * 100}%`, '--from': `color-mix(in srgb, ${color} 35%, transparent)`, '--to': tip }) as CSSProperties

/** Progress through the current division: the tier's colour, running into the next tier's when that's what comes next. */
export default function RankProgress({ rank, showLabel = true, className }: { rank: RankInfo; showLabel?: boolean; className?: string }) {
  const at = Math.min(1, Math.max(0, rank.progress))
  const next = rank.division === 'I' ? TIERS[TIERS.indexOf(rank.tier) + 1] ?? rank.tier : rank.tier
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="bar-fill h-full rounded-full transition-[width] duration-700" style={fill(at, rank.tier.color, between(rank.tier.color, next.color, at))} />
      </div>
      {showLabel && <ToNext rank={rank} />}
    </div>
  )
}

function ToNext({ rank }: { rank: RankInfo }) {
  return (
    <p className="text-xs text-muted-foreground tabular-nums">
      {rank.nextAt != null ? <>{rank.nextAt - rank.rating} pts to {rank.nextLabel}</> : 'Top of the ladder'}
    </p>
  )
}

/**
 * The overall rank's bar: the whole tier, not just the division. It names both ends (this tier
 * and the one after), marks the divisions on the way as milestones, and is never drawn empty:
 * what the research on progress bars agrees helps (a goal in sight, small steps, a start
 * already made). The gradient is the look: the fill brightens toward a glowing tip, and the
 * tip's colour moves from this tier's toward the next one's as the tier fills.
 */
export function TierProgress({ rank, className }: { rank: RankInfo; className?: string }) {
  const { lo, hi, next, divisions } = tierSpan(rank)
  // A little is always filled: right after a rank-up an empty bar reads as "nothing done"
  const at = Math.min(1, Math.max(0.04, (rank.rating - lo) / (hi - lo)))
  const to = next?.color ?? `color-mix(in srgb, ${rank.tier.color} 55%, hsl(var(--foreground)))`
  const tip = between(rank.tier.color, to, at)
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <p className="flex justify-between text-[11px] font-semibold uppercase tracking-wider">
        <span style={{ color: ink(rank.tier.color) }}>{rank.tier.name}</span>
        <span style={{ color: next ? ink(next.color) : undefined }} className={next ? undefined : 'text-muted-foreground'}>{next?.name ?? 'Max'}</span>
      </p>
      <div
        className="relative h-2.5 rounded-full bg-secondary"
        role="progressbar"
        aria-valuemin={lo}
        aria-valuemax={hi}
        aria-valuenow={rank.rating}
        aria-label={`${rank.label}, on the way to ${next?.name ?? 'the top of the ladder'}`}
      >
        <div className="bar-fill h-full rounded-full transition-[width] duration-700" style={fill(at, rank.tier.color, tip)} />
        {/* Where each division starts */}
        {divisions.slice(1).map((d, i) => (
          <span key={d} className="absolute inset-y-0 w-0.5 bg-background/70" style={{ left: `${((i + 1) / divisions.length) * 100}%` }} />
        ))}
        {/* Where you are: the one bright point on the bar */}
        <span
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full transition-[left] duration-700"
          style={{ left: `${at * 100}%`, backgroundColor: tip, boxShadow: `0 0 0 3px hsl(var(--background) / 0.55), 0 0 14px 3px ${tip}` }}
        />
      </div>
      {divisions.length > 1 && (
        <p className="flex text-[10px] font-semibold tabular-nums text-muted-foreground" aria-hidden="true">
          {divisions.map(d => (
            <span key={d} className="flex-1 pl-0.5 text-left" style={d === rank.division ? { color: ink(rank.tier.color) } : undefined}>{d}</span>
          ))}
        </p>
      )}
      <ToNext rank={rank} />
    </div>
  )
}
