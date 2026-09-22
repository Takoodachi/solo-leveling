import type { GroupRank } from '../computeRanks'
import RankBadge from './RankBadge'

/** One tile per muscle group; its rank is the group's strongest lift. */
export default function MuscleGroupGrid({ groups }: { groups: GroupRank[] }) {
  return (
    // Three per row; the last row is centered.
    <div className="flex flex-wrap justify-center gap-2">
      {groups.map(g => (
        <div key={g.key} className="flex w-[calc((100%-1rem)/3)] flex-col items-center gap-1 rounded-3xl bg-card px-2 py-3 text-center">
          <RankBadge tier={g.rank?.tier.key ?? 'wood'} size={44} locked={!g.rank} />
          <p className="text-sm font-semibold">{g.label}</p>
          <p className="text-xs font-semibold" style={g.rank ? { color: g.rank.tier.color } : undefined}>
            {g.rank ? g.rank.label : <span className="font-normal text-muted-foreground">Unranked</span>}
          </p>
          {g.topLift && <p className="w-full truncate text-[11px] text-muted-foreground">{g.topLift}</p>}
        </div>
      ))}
    </div>
  )
}
