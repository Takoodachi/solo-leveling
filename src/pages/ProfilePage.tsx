import PageHeader from '@/components/PageHeader'
import { useIsNavTab } from '@/hooks/useNavTabs'
import ProfileCard from '@/features/settings/components/ProfileCard'
import ShortcutsCard from '@/features/settings/components/ShortcutsCard'
import AchievementsGrid from '@/features/settings/components/AchievementsGrid'
import BodyGoalsCard from '@/features/settings/components/BodyGoalsCard'
import TargetsCard from '@/features/settings/components/TargetsCard'
import RankSummaryCard from '@/features/ranks/components/RankSummaryCard'
import LeaderboardCard from '@/features/leaderboard/components/LeaderboardCard'

/** You: name and photo, level, ranks, achievements, body and goals. App settings are on the Settings tab. */
export default function ProfilePage() {
  const isTab = useIsNavTab('/profile')

  return (
    <div className="flex flex-col gap-6">
      <PageHeader back={isTab ? undefined : '/home'} title="Profile" />
      <ProfileCard />
      <ShortcutsCard />
      <RankSummaryCard />
      <LeaderboardCard />
      <AchievementsGrid />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Body & goals</h2>
        <BodyGoalsCard />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Daily targets</h2>
        <TargetsCard />
      </section>
    </div>
  )
}
