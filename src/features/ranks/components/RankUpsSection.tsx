import { motion } from 'framer-motion'
import { Play, TrendingUp } from 'lucide-react'
import type { RankUp } from '../computeRanks'
import RankBadge from './RankBadge'
import { ink } from '@/lib/colors'

interface Props {
  ups: RankUp[]
  animate?: boolean
  /** Tapping a row plays its rank-up scene again. */
  onReplay?: (up: RankUp) => void
}

/** "Rank ups" block on the workout summary; badges pop in when celebrating. */
export default function RankUpsSection({ ups, animate = false, onReplay }: Props) {
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
              className="relative flex items-center gap-3"
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
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ backgroundColor: `${u.to.tier.color}26`, color: ink(u.to.tier.color) }}>
                      New tier
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {u.from ? <>{u.from.label} → </> : 'Ranked '}
                  <span className="font-semibold" style={{ color: ink(u.to.tier.color) }}>{u.to.label}</span>
                </p>
              </div>
              {onReplay && (
                // Covers the row, so the whole of it is the tap target
                <button
                  type="button"
                  onClick={() => onReplay(u)}
                  aria-label={`Replay the rank-up for ${u.id === 'overall' ? 'your overall rank' : u.name}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground after:absolute after:inset-0 hover:bg-accent"
                >
                  <Play size={14} />
                </button>
              )}
            </motion.li>
          )
        })}
      </ul>
    </section>
  )
}
