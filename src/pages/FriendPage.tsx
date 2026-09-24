import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { startOfWeek } from 'date-fns'
import { motion } from 'framer-motion'
import { Flame } from 'lucide-react'
import FullScreen from '@/components/FullScreen'
import PageHeader from '@/components/PageHeader'
import { toDateStr } from '@/lib/date'
import { useNow } from '@/hooks/useNow'
import type { MuscleRegion } from '@/features/ranks/standards'
import { rankFor } from '@/features/ranks/tiers'
import RankBadge from '@/features/ranks/components/RankBadge'
import Bodygraph from '@/features/ranks/components/Bodygraph'
import RegionDetail from '@/features/ranks/components/RegionDetail'
import { useLeaderboard } from '@/features/leaderboard/useLeaderboard'
import { ago, regionsOf } from '@/features/leaderboard/boards'
import HeadToHead from '@/features/leaderboard/components/HeadToHead'
import CompareChart from '@/features/leaderboard/components/CompareChart'
import { TopLifts, WeekTiles } from '@/features/leaderboard/components/FriendStats'

/** A friend's shared profile (or your own, as friends see it). */
export default function FriendPage() {
  const { id } = useParams()
  const now = useNow()
  const lb = useLeaderboard()
  const [selected, setSelected] = useState<MuscleRegion | null>(null)
  const entry = id === 'me' ? lb.me : (lb.rows ?? []).find(e => e.userId === id)

  if (!entry) {
    return (
      <FullScreen className="flex flex-col gap-6">
        <PageHeader back="/leaderboard" title="Leaderboard" />
        <p className="rounded-3xl bg-card p-5 text-sm text-muted-foreground">
          {lb.ready ? 'This person isn’t sharing on the leaderboard.' : 'Loading…'}
        </p>
      </FullScreen>
    )
  }

  const s = entry.snapshot
  const self = id === 'me'
  const overall = s.overall != null ? rankFor(s.overall) : null
  const regions = regionsOf(s)
  const weekStart = toDateStr(startOfWeek(now, { weekStartsOn: 1 }))

  return (
    <FullScreen className="flex flex-col gap-6">
      <PageHeader back="/leaderboard" eyebrow={self ? 'What friends see' : undefined} title={self ? 'Your profile' : entry.name} />

      <section
        className="-mx-4 flex flex-col items-center px-6 text-center"
        style={overall ? { background: `radial-gradient(closest-side at 50% 32%, ${overall.tier.color}33, transparent)` } : undefined}
      >
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 14, stiffness: 160 }}>
          <RankBadge tier={overall?.tier.key ?? 'wood'} size={120} locked={!overall} />
        </motion.div>
        <h2 className="font-heading text-2xl font-bold uppercase tracking-wide" style={overall ? { color: overall.tier.color } : undefined}>
          {overall?.label ?? 'Unranked'}
        </h2>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          Level {s.level}
          <span>·</span>
          <Flame size={14} className={s.streak > 0 ? 'fill-primary text-primary' : ''} /> {s.streak}-day streak
          {s.running && <><span>·</span> {rankFor(s.running.rating).label} runner</>}
        </p>
        {!self && entry.updatedAt && <p className="mt-0.5 text-xs text-muted-foreground">Updated {ago(entry.updatedAt.slice(0, 10), now)}</p>}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Bodygraph</h2>
        <Bodygraph regions={regions} selected={selected} onSelect={setSelected} />
        <RegionDetail region={regions.find(r => r.key === selected) ?? null} suggest={false} />
      </section>

      {!self && lb.me && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Head to head</h2>
          <HeadToHead me={lb.me.snapshot} them={s} name={entry.name} />
        </section>
      )}

      <CompareChart them={s} name={self ? 'You' : entry.name} me={self ? undefined : lb.me?.snapshot} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">This week</h2>
        <WeekTiles s={s} weekStart={weekStart} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Best lifts</h2>
        <TopLifts s={s} />
      </section>
    </FullScreen>
  )
}
