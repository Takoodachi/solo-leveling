import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GroupRank } from '../computeRanks'
import type { MuscleRegion } from '../standards'
import RankBadge from './RankBadge'

interface Props {
  groups: GroupRank[]
  selected: MuscleRegion | null
  onSelect: (region: MuscleRegion) => void
}

/** Muscle groups with "2/3 ranked" progress; expand for each muscle's rank. Complete groups glow in their tier colour. */
export default function MuscleRankings({ groups, selected, onSelect }: Props) {
  const [open, setOpen] = useState<string | null>(null)

  return (
    <ul className="flex flex-col gap-2">
      {groups.map(g => {
        const total = g.regions.length
        const complete = g.ranked === total && g.rank
        const expanded = open === g.key
        return (
          <li
            key={g.key}
            className="overflow-hidden rounded-3xl bg-card"
            style={complete ? { backgroundColor: `color-mix(in srgb, ${g.rank!.tier.color} 16%, hsl(var(--card)))` } : undefined}
          >
            <button type="button" onClick={() => setOpen(expanded ? null : g.key)} className="flex w-full items-center gap-3 p-3 pr-4 text-left" aria-expanded={expanded}>
              <RankBadge tier={g.rank?.tier.key ?? 'wood'} size={44} locked={!g.rank} />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{g.label}</span>
                <span className="block text-xs">
                  {g.rank && <span className="font-semibold" style={{ color: g.rank.tier.color }}>{g.rank.label} · </span>}
                  <span className="text-muted-foreground">{complete ? 'All muscles ranked' : `${g.ranked}/${total} ranked`}</span>
                </span>
              </span>
              <ChevronDown size={18} className={cn('shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
            </button>
            {expanded && (
              <ul className="flex flex-col gap-1 px-3 pb-3">
                {g.regions.map(r => (
                  <li key={r.key}>
                    <button
                      type="button"
                      onClick={() => onSelect(r.key)}
                      className={cn('flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left', selected === r.key ? 'bg-white/10' : 'hover:bg-white/5')}
                    >
                      <RankBadge tier={r.rank?.tier.key ?? 'wood'} size={30} locked={!r.rank} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{r.label}</span>
                        <span className="block truncate text-xs text-muted-foreground">{r.topLift ?? 'Not trained yet'}</span>
                      </span>
                      <span className="shrink-0 text-xs font-semibold" style={r.rank ? { color: r.rank.tier.color } : undefined}>
                        {r.rank?.label ?? <span className="font-normal text-muted-foreground">Unranked</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        )
      })}
    </ul>
  )
}
