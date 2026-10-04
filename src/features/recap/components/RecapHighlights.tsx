import { Link } from 'react-router-dom'
import { TrendingUp } from 'lucide-react'
import { ink } from '@/lib/colors'
import RankBadge from '@/features/ranks/components/RankBadge'
import type { WeekRecap } from '../recap'

/** The week's wins: overall rank and anything that beat every earlier session. */
export default function RecapHighlights({ recap }: { recap: WeekRecap }) {
  const { rank, bests } = recap
  const rankedUp = !!rank && (!rank.from || rank.to.step > rank.from.step)
  const gained = rank?.from ? rank.to.rating - rank.from.rating : 0
  if (!rank && bests.length === 0) return null

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Highlights</h2>
      {rank && (
        <Link to="/ranks" className="flex items-center gap-3 rounded-3xl bg-card p-4">
          <RankBadge tier={rank.to.tier.key} size={48} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold" style={{ color: ink(rank.to.tier.color) }}>{rank.to.label}</p>
            <p className="text-sm text-muted-foreground">
              {rankedUp
                ? rank.from ? `Overall rank, up from ${rank.from.label}` : 'Your first overall rank'
                : gained > 0 ? `Overall rank · +${gained} rating this week` : 'Overall rank held'}
            </p>
          </div>
        </Link>
      )}
      {bests.length > 0 && (
        <div className="overflow-hidden rounded-3xl bg-card">
          <p className="flex items-center gap-2 px-4 pt-4 text-sm font-semibold">
            <TrendingUp size={16} className="text-primary" /> {bests.length} new best{bests.length === 1 ? '' : 's'}
          </p>
          <ul className="px-4 pb-2">
            {bests.map(b => (
              <li key={b.exerciseId} className="flex items-baseline justify-between gap-3 border-b border-foreground/5 py-2.5 text-sm last:border-0">
                <span className="min-w-0 truncate font-medium">{b.name}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {b.kind === '1rm' ? 'est. 1RM ' : 'longest '}
                  {b.from} → <span className="font-semibold text-foreground">{b.to} {b.kind === '1rm' ? 'kg' : 'km'}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
