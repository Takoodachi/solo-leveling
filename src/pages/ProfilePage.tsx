import PageHeader from '@/components/PageHeader'
import { useIsNavTab } from '@/hooks/useNavTabs'
import ProfileCard from '@/features/settings/components/ProfileCard'
import ShortcutsCard from '@/features/settings/components/ShortcutsCard'
import AchievementsSection from '@/features/gamification/components/AchievementsSection'
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
      <AchievementsSection />

      <section id="body-goals" className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Body & goals</h2>
        <BodyGoalsCard />
      </section>

      <section id="targets" className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Daily targets</h2>
        <TargetsCard />
      </section>
    </div>
  )
}
