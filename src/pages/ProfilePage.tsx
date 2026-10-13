import { Goal, Ruler } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { useIsNavTab } from '@/hooks/useNavTabs'
import ProfileCard from '@/features/settings/components/ProfileCard'
import ShortcutsCard from '@/features/settings/components/ShortcutsCard'
import AchievementsSection from '@/features/gamification/components/AchievementsSection'
import BodyGoalsCard from '@/features/settings/components/BodyGoalsCard'
import TargetsCard from '@/features/settings/components/TargetsCard'
import RankSummaryCard from '@/features/ranks/components/RankSummaryCard'
import LeaderboardCard from '@/features/leaderboard/components/LeaderboardCard'
import SettingsSection from '@/features/settings/components/SettingsSection'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { useBodyMetrics } from '@/features/bodyMetrics/useBodyMetrics'
import { useTargets } from '@/features/nutrition/hooks/useTargets'

const GOAL = { cut: 'Cut', maintain: 'Maintain', bulk: 'Bulk' }

/** You: name and photo, level, ranks, achievements, body and goals. App settings are on the Settings tab. */
export default function ProfilePage() {
  const isTab = useIsNavTab('/profile')
  const { settings } = useSettings()
  const weight = useBodyMetrics(1).metrics?.[0]?.weightKg
  const { targets } = useTargets()
  const body = [settings?.goalType && GOAL[settings.goalType], settings?.heightCm && `${settings.heightCm} cm`, weight && `${weight} kg`].filter(Boolean).join(' · ')

  return (
    <div className="flex flex-col gap-6">
      <PageHeader back={isTab ? undefined : '/home'} title="Profile" />
      <ProfileCard />
      <ShortcutsCard />
      <RankSummaryCard />
      <LeaderboardCard />
      <AchievementsSection />

      {/* The two forms: rows that open on a tap, like Settings (they made the page a screen longer) */}
      <div className="flex flex-col gap-3">
        <SettingsSection id="body-goals" title="Body & goals" summary={body || 'Not set yet'} Icon={Ruler}>
          <BodyGoalsCard />
        </SettingsSection>
        <SettingsSection id="targets" title="Daily targets" summary={targets ? `${targets.dailyKcal.toLocaleString()} kcal · ${targets.dailyProtein} g protein` : 'Not set yet'} Icon={Goal}>
          <TargetsCard />
        </SettingsSection>
      </div>
    </div>
  )
}
