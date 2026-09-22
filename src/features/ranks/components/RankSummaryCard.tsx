import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useRanks } from '../useRanks'
import { MIN_GROUPS_FOR_OVERALL } from '../computeRanks'
import RankBadge from './RankBadge'
import RankProgress from './RankProgress'

/** Home / Profile entry point to the ranks screen. */
export default function RankSummaryCard() {
  const ranks = useRanks()
  if (!ranks) return null

  const top = ranks.lifts[0]
  const rankedGroups = ranks.groups.filter(g => g.rank).length
  const shown = ranks.overall ?? top?.rank ?? null

  let eyebrow = 'Strength rank'
  let body: ReactNode
  if (ranks.status !== 'ready') {
    body = <p className="text-sm text-muted-foreground">Set your {ranks.status === 'needs-sex' ? 'sex' : 'body weight'} to unlock ranks from Wood to Olympian.</p>
  } else if (!shown) {
    body = <p className="text-sm text-muted-foreground">Log a strength set (bench, squat, rows, curls…) to earn your first rank.</p>
  } else {
    if (!ranks.overall) eyebrow = `Best lift · ${top.name}`
    body = (
      <>
        <p className="flex items-baseline gap-2">
          <span className="font-heading text-xl font-bold" style={{ color: shown.tier.color }}>{shown.label}</span>
          <span className="text-xs text-muted-foreground tabular-nums">{shown.rating} / 1000</span>
        </p>
        <RankProgress rank={shown} className="mt-2" />
        {!ranks.overall && (
          <p className="mt-1 text-xs text-muted-foreground">
            Overall rank unlocks at {MIN_GROUPS_FOR_OVERALL} ranked muscle groups ({rankedGroups}/{MIN_GROUPS_FOR_OVERALL})
          </p>
        )}
      </>
    )
  }

  return (
    <Link to="/ranks" className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-3xl bg-card p-4">
      <RankBadge tier={shown?.tier.key ?? 'wood'} size={64} locked={!shown} />
      <div className="min-w-0">
        <p className="eyebrow truncate text-muted-foreground">{eyebrow}</p>
        {body}
      </div>
      <ChevronRight size={18} className="text-muted-foreground" />
    </Link>
  )
}
