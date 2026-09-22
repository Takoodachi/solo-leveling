import FullScreen from '@/components/FullScreen'
import PageHeader from '@/components/PageHeader'
import { useRanks } from '@/features/ranks/useRanks'
import RankHero from '@/features/ranks/components/RankHero'
import RankSetupCard from '@/features/ranks/components/RankSetupCard'
import MuscleGroupGrid from '@/features/ranks/components/MuscleGroupGrid'
import LiftRankList from '@/features/ranks/components/LiftRankList'
import RankLadder from '@/features/ranks/components/RankLadder'

export default function RanksPage() {
  const ranks = useRanks()

  return (
    <FullScreen className="flex flex-col gap-6">
      <PageHeader back="/profile" title="Strength ranks" />
      {ranks && (ranks.status === 'ready' ? (
        <>
          <RankHero ranks={ranks} />
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Muscle groups</h2>
            <MuscleGroupGrid groups={ranks.groups} />
          </section>
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
