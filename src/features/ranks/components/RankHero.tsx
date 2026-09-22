import { motion } from 'framer-motion'
import type { RanksSnapshot } from '../computeRanks'
import { MIN_GROUPS_FOR_OVERALL } from '../computeRanks'
import RankBadge from './RankBadge'
import RankProgress from './RankProgress'

/** Big overall emblem at the top of the ranks screen. */
export default function RankHero({ ranks }: { ranks: RanksSnapshot }) {
  const overall = ranks.overall
  const ranked = ranks.groups.filter(g => g.rank).length
  const color = overall?.tier.color ?? 'hsl(var(--muted-foreground))'

  return (
    <section
      className="relative -mx-4 flex flex-col items-center px-6 pb-2 pt-4 text-center"
      style={overall ? { background: `radial-gradient(closest-side at 50% 32%, ${overall.tier.color}33, transparent)` } : undefined}
    >
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 14, stiffness: 160 }}>
        <RankBadge tier={overall?.tier.key ?? 'wood'} size={148} locked={!overall} />
      </motion.div>
      <p className="eyebrow relative mt-1 text-muted-foreground">Overall rank</p>
      {overall ? (
        <>
          <h2 className="relative font-heading text-3xl font-bold uppercase tracking-wide" style={{ color }}>{overall.label}</h2>
          <p className="relative text-sm text-muted-foreground tabular-nums">Strength rating {overall.rating} / 1000</p>
          <RankProgress rank={overall} className="relative mt-4 w-full max-w-xs" />
        </>
      ) : (
        <>
          <h2 className="relative font-heading text-2xl font-bold">Unranked</h2>
          <p className="relative mt-1 max-w-xs text-sm text-muted-foreground">
            Rank lifts in {MIN_GROUPS_FOR_OVERALL} muscle groups to unlock your overall rank ({ranked}/{MIN_GROUPS_FOR_OVERALL}).
          </p>
        </>
      )}
    </section>
  )
}
