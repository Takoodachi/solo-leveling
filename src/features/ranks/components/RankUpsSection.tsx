import { motion } from 'framer-motion'
import { TrendingUp } from 'lucide-react'
import type { RankUp } from '../computeRanks'
import RankBadge from './RankBadge'

/** "Rank ups" block on the workout summary; badges pop in when celebrating. */
export default function RankUpsSection({ ups, animate = false }: { ups: RankUp[]; animate?: boolean }) {
  if (ups.length === 0) return null

  return (
    <section className="rounded-3xl bg-card p-5">
      <h2 className="mb-3 flex items-center gap-2 font-semibold"><TrendingUp size={18} className="text-primary" /> Rank ups</h2>
      <ul className="flex flex-col gap-3">
        {ups.map((u, i) => {
          const delay = 0.45 + i * 0.12
          const newTier = !u.from || u.from.tier.key !== u.to.tier.key
          return (
            <motion.li
              key={u.id}
              initial={animate ? { opacity: 0, y: 8 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay }}
              className="flex items-center gap-3"
            >
              <motion.div
                initial={animate ? { scale: 0.3, rotate: -15 } : false}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 9, stiffness: 220, delay }}
              >
                <RankBadge tier={u.to.tier.key} size={u.id === 'overall' ? 60 : 46} />
              </motion.div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2">
                  <span className="truncate font-semibold">{u.id === 'overall' ? 'Overall rank' : u.name}</span>
                  {newTier && u.from && (
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ backgroundColor: `${u.to.tier.color}26`, color: u.to.tier.color }}>
                      New tier
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {u.from ? <>{u.from.label} → </> : 'Ranked '}
                  <span className="font-semibold" style={{ color: u.to.tier.color }}>{u.to.label}</span>
                </p>
              </div>
            </motion.li>
          )
        })}
      </ul>
    </section>
  )
}
