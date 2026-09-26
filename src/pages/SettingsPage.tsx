import type { ReactNode } from 'react'
import PageHeader from '@/components/PageHeader'
import { useAuthStore } from '@/features/auth/authStore'
import AccountCard from '@/features/settings/components/AccountCard'
import ThemePicker from '@/features/settings/components/ThemePicker'
import NavBarCard from '@/features/settings/components/NavBarCard'
import HomeLayoutCard from '@/features/settings/components/HomeLayoutCard'
import ExportButton from '@/features/settings/components/ExportButton'
import ImportButton from '@/features/settings/components/ImportButton'
import ShareCard from '@/features/leaderboard/components/ShareCard'

const APP_VERSION = '0.3.0'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  )
}

/** App settings (the Settings tab). Who you are and your goals live on Profile. */
export default function SettingsPage() {
  const signedIn = useAuthStore(s => !!s.userId)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" />
      <AccountCard />
      {signedIn && (
        <Section title="Leaderboard">
          <ShareCard />
        </Section>
      )}
      <Section title="Theme">
        <ThemePicker />
      </Section>
      <Section title="Bottom bar">
        <NavBarCard />
      </Section>
      <Section title="Home screen">
        <HomeLayoutCard />
      </Section>
      <Section title="Backup">
        <div className="flex flex-col gap-3 rounded-3xl bg-card p-5">
          <p className="text-sm text-muted-foreground">A JSON copy of your data, independent of cloud sync.</p>
          <div className="flex gap-2">
            <ExportButton />
            <ImportButton />
          </div>
        </div>
      </Section>
      <p className="text-center text-xs text-muted-foreground">Solo Leveling · v{APP_VERSION}</p>
    </div>
  )
}
