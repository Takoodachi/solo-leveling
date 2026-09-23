import PageHeader from '@/components/PageHeader'
import ProfileCard from '@/features/settings/components/ProfileCard'
import AchievementsGrid from '@/features/settings/components/AchievementsGrid'
import AccountCard from '@/features/settings/components/AccountCard'
import BodyGoalsCard from '@/features/settings/components/BodyGoalsCard'
import TargetsCard from '@/features/settings/components/TargetsCard'
import ExportButton from '@/features/settings/components/ExportButton'
import ImportButton from '@/features/settings/components/ImportButton'
import RankSummaryCard from '@/features/ranks/components/RankSummaryCard'
import HomeLayoutCard from '@/features/settings/components/HomeLayoutCard'

export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Profile" />
      <ProfileCard />
      <RankSummaryCard />
      <AccountCard />
      <AchievementsGrid />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Body & goals</h2>
        <BodyGoalsCard />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Daily targets</h2>
        <TargetsCard />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Home screen</h2>
        <HomeLayoutCard />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Backup</h2>
        <div className="flex flex-col gap-3 rounded-3xl bg-card p-5">
          <p className="text-sm text-muted-foreground">A JSON copy of your data, independent of cloud sync.</p>
          <div className="flex gap-2">
            <ExportButton />
            <ImportButton />
          </div>
        </div>
      </section>

      <p className="text-center text-xs text-muted-foreground">Solo Leveling · v0.2.0</p>
    </div>
  )
}
