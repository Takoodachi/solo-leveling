import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import FullScreen from '@/components/FullScreen'
import PageHeader from '@/components/PageHeader'
import { useRanks } from '@/features/ranks/useRanks'
import type { MuscleRegion } from '@/features/ranks/standards'
import RankHero from '@/features/ranks/components/RankHero'
import RankSetupCard from '@/features/ranks/components/RankSetupCard'
import Bodygraph from '@/features/ranks/components/Bodygraph'
import RegionDetail from '@/features/ranks/components/RegionDetail'
import MuscleRankings from '@/features/ranks/components/MuscleRankings'
import RankHistoryChart from '@/features/ranks/components/RankHistoryChart'
import RunningRankCard from '@/features/ranks/components/RunningRankCard'
import LiftRankList from '@/features/ranks/components/LiftRankList'
import RankLadder from '@/features/ranks/components/RankLadder'

export default function RanksPage() {
  const ranks = useRanks()
  const [selected, setSelected] = useState<MuscleRegion | null>(null)

  return (
    <FullScreen className="flex flex-col gap-6">
      <PageHeader
        back="/profile"
        title="Ranks"
        action={
          <Link to="/leaderboard" className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-accent" aria-label="Leaderboard">
            <Trophy size={20} />
          </Link>
        }
      />
      {ranks && (ranks.status === 'ready' ? (
        <>
          <RankHero ranks={ranks} />
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Ranked bodygraph</h2>
            <Bodygraph regions={ranks.regions} selected={selected} onSelect={setSelected} />
            <RegionDetail region={ranks.regions.find(r => r.key === selected) ?? null} />
          </section>
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Muscle rankings</h2>
            <MuscleRankings groups={ranks.groups} selected={selected} onSelect={setSelected} />
          </section>
          {ranks.sex && (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">Running rank</h2>
              <RunningRankCard running={ranks.running} sex={ranks.sex} regions={ranks.regions} />
            </section>
          )}
          <RankHistoryChart />
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Lifts</h2>
            <LiftRankList ranks={ranks} />
          </section>
        </>
      ) : (
        <RankSetupCard ranks={ranks} />
      ))}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">How ranks work</h2>
        <RankLadder />
      </section>
    </FullScreen>
  )
}
