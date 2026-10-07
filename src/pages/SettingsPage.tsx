import { Bell, Cloud, DatabaseBackup, Dumbbell, Footprints, LayoutGrid, Palette, PanelBottom, Smartphone, Trophy } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import Logo from '@/components/Logo'
import { NAV_CHOICES, navTabsFrom } from '@/components/navTabs'
import { useAuthStore } from '@/features/auth/authStore'
import SettingsSection from '@/features/settings/components/SettingsSection'
import AccountCard from '@/features/settings/components/AccountCard'
import ThemePicker from '@/features/settings/components/ThemePicker'
import NavBarCard from '@/features/settings/components/NavBarCard'
import HomeLayoutCard from '@/features/settings/components/HomeLayoutCard'
import WorkoutPrefsCard from '@/features/settings/components/WorkoutPrefsCard'
import AppShortcutsCard from '@/features/settings/components/AppShortcutsCard'
import ExportButton from '@/features/settings/components/ExportButton'
import ImportButton from '@/features/settings/components/ImportButton'
import { APP_SHORTCUTS, appShortcutsFrom } from '@/features/settings/appShortcuts'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { resolveTheme } from '@/features/settings/themes'
import { HOME_WIDGETS, homeWidgetsFrom } from '@/features/dashboard/homeWidgets'
import ShareCard from '@/features/leaderboard/components/ShareCard'
import { isSharing } from '@/features/leaderboard/api'
import HealthStepsCard from '@/features/health/components/HealthStepsCard'
import RemindersCard from '@/features/reminders/components/RemindersCard'
import { REMINDERS, reminderPrefs } from '@/features/reminders/reminders'
import { isAndroidApp } from '@/lib/native'
import { isSupabaseConfigured } from '@/lib/supabase'

const APP_VERSION = '0.3.0'

/**
 * App settings (the Settings tab). Who you are and your goals live on Profile. Every section is
 * a row that opens on a tap, with what's set now written under its name.
 */
export default function SettingsPage() {
  const signedIn = useAuthStore(s => !!s.userId)
  const email = useAuthStore(s => s.session?.user.email)
  const { settings } = useSettings()
  const reminders = reminderPrefs(settings)
  const remindersOn = REMINDERS.filter(r => reminders[r.kind].on).length
  const [left, right] = navTabsFrom(settings)
  const shortcuts = appShortcutsFrom(settings)

  return (
    <div className="flex flex-col gap-3">
      <PageHeader title="Settings" />
      {isSupabaseConfigured && (
        <SettingsSection id="account" title="Account & sync" summary={email ?? 'Not signed in'} Icon={Cloud}>
          <AccountCard />
        </SettingsSection>
      )}
      {signedIn && (
        <SettingsSection id="sharing" title="Leaderboard" summary={isSharing(settings) ? 'Sharing with friends' : 'Not sharing'} Icon={Trophy}>
          <ShareCard />
        </SettingsSection>
      )}
      {isAndroidApp() && (
        <SettingsSection id="steps" title="Steps" summary="From Samsung Health" Icon={Footprints}>
          <HealthStepsCard />
        </SettingsSection>
      )}
      <SettingsSection id="reminders" title="Reminders" summary={remindersOn ? `${remindersOn} on` : 'None on'} Icon={Bell}>
        <RemindersCard />
      </SettingsSection>
      <SettingsSection id="workouts" title="Workouts" summary={settings?.workoutTips === false ? 'Tips off' : 'Tips on'} Icon={Dumbbell}>
        <WorkoutPrefsCard />
      </SettingsSection>
      <SettingsSection id="theme" title="Theme" summary={resolveTheme(settings?.theme, settings?.customTheme).name} Icon={Palette}>
        <ThemePicker />
      </SettingsSection>
      <SettingsSection id="bottom-bar" title="Bottom bar" summary={`${NAV_CHOICES[left].label} · ${NAV_CHOICES[right].label}`} Icon={PanelBottom}>
        <NavBarCard />
      </SettingsSection>
      <SettingsSection id="home-screen" title="Home screen" summary={`${homeWidgetsFrom(settings).length} of ${HOME_WIDGETS.length} cards shown`} Icon={LayoutGrid}>
        <HomeLayoutCard />
      </SettingsSection>
      {isAndroidApp() && (
        <SettingsSection id="app-icon" title="App icon" summary={shortcuts.map(id => APP_SHORTCUTS[id].label).join(' · ') || 'No shortcuts'} Icon={Smartphone}>
          <AppShortcutsCard />
        </SettingsSection>
      )}
      <SettingsSection id="backup" title="Backup" summary="Export or import a copy" Icon={DatabaseBackup}>
        <div className="flex flex-col gap-3 rounded-3xl bg-card p-5">
          <p className="text-sm text-muted-foreground">A JSON copy of your data, independent of cloud sync.</p>
          <div className="flex gap-2">
            <ExportButton />
            <ImportButton />
          </div>
        </div>
      </SettingsSection>
      <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Logo size={16} /> Solo Leveling · v{APP_VERSION}
      </p>
    </div>
  )
}
