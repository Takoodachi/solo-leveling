import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import Segmented from '@/components/Segmented'
import { useIsNavTab } from '@/hooks/useNavTabs'
import { usePageTab } from '@/hooks/usePageTab'
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

// One long page became three shorter ones. A section's id says which tab it's on, so links to
// a section (search results) still land on it.
const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'lifts', label: 'Lifts' },
  { value: 'progress', label: 'Progress' },
] as const
type Tab = typeof TABS[number]['value']
const SECTION_TAB: Record<string, Tab> = {
  bodygraph: 'overview',
  'muscle-rankings': 'overview',
  lifts: 'lifts',
  'running-rank': 'lifts',
  'rank-progress': 'progress',
  'how-ranks-work': 'progress',
}

export default function RanksPage() {
  const ranks = useRanks()
  const [selected, setSelected] = useState<MuscleRegion | null>(null)
  const isTab = useIsNavTab('/ranks')
  const [tab, setTab] = usePageTab('ranks', TABS.map(t => t.value), SECTION_TAB)
  const ladder = (
    <section id="how-ranks-work" className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">How ranks work</h2>
      <RankLadder />
    </section>
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={isTab ? undefined : '/home'}
        title="Ranks"
        action={
          <Link to="/leaderboard" className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-accent" aria-label="Leaderboard">
            <Trophy size={20} />
          </Link>
        }
      />
      {ranks && (ranks.status === 'ready' ? (
        <>
          <Segmented value={tab} onChange={setTab} options={TABS} className="-mt-2" />
          <div key={tab} className="flex animate-fade-in flex-col gap-6">
          {tab === 'overview' && (
            <>
              <RankHero ranks={ranks} />
              <section id="bodygraph" className="flex flex-col gap-3">
                <h2 className="text-lg font-semibold">Ranked bodygraph</h2>
                <Bodygraph regions={ranks.regions} selected={selected} onSelect={setSelected} />
                <RegionDetail region={ranks.regions.find(r => r.key === selected) ?? null} />
              </section>
              <section id="muscle-rankings" className="flex flex-col gap-3">
                <h2 className="text-lg font-semibold">Muscle rankings</h2>
                <MuscleRankings groups={ranks.groups} selected={selected} onSelect={setSelected} />
              </section>
            </>
          )}
          {tab === 'lifts' && (
            <>
              <section id="lifts" className="flex flex-col gap-3">
                <h2 className="text-lg font-semibold">Lifts</h2>
                <LiftRankList ranks={ranks} />
              </section>
              {ranks.sex && (
                <section id="running-rank" className="flex flex-col gap-3">
                  <h2 className="text-lg font-semibold">Running rank</h2>
                  <RunningRankCard running={ranks.running} sex={ranks.sex} regions={ranks.regions} />
                </section>
              )}
            </>
          )}
          {tab === 'progress' && (
            <>
              <RankHistoryChart />
              {ladder}
            </>
          )}
          </div>
        </>
      ) : (
        <>
          <RankSetupCard ranks={ranks} />
          {ladder}
        </>
      ))}
    </div>
  )
}
