import { lazy, Suspense, useEffect, useLayoutEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import AppShell from '@/components/AppShell'
import Logo from '@/components/Logo'
import { lazyAhead, loadAhead } from '@/lib/lazyAhead'
import { useAuthInit } from '@/features/auth/useAuthInit'
import { useAuthStore } from '@/features/auth/authStore'
import { useLeaderboardPublisher } from '@/features/leaderboard/usePublisher'
import { useThemeSync } from '@/features/settings/hooks/useTheme'
import { useHealthStepsSync } from '@/features/health/useHealthStepsSync'
import { useHashScroll } from '@/hooks/useHashScroll'
import { useNativeLinks } from '@/hooks/useNativeLinks'
import { useAndroidBack } from '@/hooks/useAndroidBack'
import { useVisibleViewport } from '@/hooks/useVisibleViewport'
import { useAppShortcuts } from '@/features/settings/hooks/useAppShortcuts'
import { useReminderScheduler } from '@/features/reminders/useReminderScheduler'
import { useDailyQuestReward } from '@/features/gamification/useDailyQuest'
import { useNeedsSetup } from '@/features/setup/setup'
import Wallpaper from '@/features/settings/components/Wallpaper'
import LoginPage from '@/features/auth/LoginPage'
import HomePage from '@/pages/HomePage'

// Every screen but the first is its own file, fetched ahead in this order once the first is up
// (lib/lazyAhead.ts): the ones that can be in the bottom bar, then the rest.
const WorkoutsPage = lazyAhead(() => import('@/pages/WorkoutsPage'))
const AnalyticsPage = lazyAhead(() => import('@/pages/AnalyticsPage'))
const SettingsPage = lazyAhead(() => import('@/pages/SettingsPage'))
const NutritionPage = lazyAhead(() => import('@/pages/NutritionPage'))
const ProfilePage = lazyAhead(() => import('@/pages/ProfilePage'))
const RanksPage = lazyAhead(() => import('@/pages/RanksPage'))
const LeaderboardPage = lazyAhead(() => import('@/pages/LeaderboardPage'))
const WorkoutHistoryPage = lazyAhead(() => import('@/pages/WorkoutHistoryPage'))
const NutritionHistoryPage = lazyAhead(() => import('@/pages/NutritionHistoryPage'))
const RoutineDetailPage = lazyAhead(() => import('@/pages/RoutineDetailPage'))
const RoutineEditPage = lazyAhead(() => import('@/pages/RoutineEditPage'))
const ActiveWorkoutPage = lazyAhead(() => import('@/pages/ActiveWorkoutPage'))
const WorkoutSummaryPage = lazyAhead(() => import('@/pages/WorkoutSummaryPage'))
const PlanPage = lazyAhead(() => import('@/pages/PlanPage'))
const FriendPage = lazyAhead(() => import('@/pages/FriendPage'))
const WeightLogPage = lazyAhead(() => import('@/features/bodyMetrics/WeightLogPage'))
const RecapPage = lazyAhead(() => import('@/pages/RecapPage'))
const WelcomePage = lazy(() => import('@/pages/WelcomePage'))

/**
 * The launch screen. index.html draws the same mark in the same place while the app's code
 * loads, so the two read as one screen that the app then opens out of. Keep them alike.
 */
function LaunchScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-page text-foreground">
      <Logo size={72} className="animate-pulse" />
    </div>
  )
}

/** Screens scroll the document, so start each new screen at the top. */
function ScrollToTop() {
  const { pathname } = useLocation()
  // Block body: newer browsers return a Promise from scrollTo, which must not become the effect's cleanup.
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

/** Opaque band behind the status bar / Dynamic Island so scrolled content never runs under the clock. */
function StatusBarScrim() {
  return <div aria-hidden="true" className="status-scrim pointer-events-none fixed inset-x-0 top-0 z-[45] h-[env(safe-area-inset-top)] bg-background/90 backdrop-blur-xl transition-opacity duration-200" />
}

function AppRoutes() {
  useAuthInit()
  useLeaderboardPublisher()
  useThemeSync()
  useHashScroll()
  useVisibleViewport()
  const session = useAuthStore(s => s.session)
  const userId = useAuthStore(s => s.userId)
  const loading = useAuthStore(s => s.loading)
  const localMode = useAuthStore(s => s.localMode)
  const ready = !loading && (!!userId || localMode)
  useHealthStepsSync(ready)
  useReminderScheduler(ready)
  useDailyQuestReward(ready)
  const needsSetup = useNeedsSetup(ready)
  useEffect(() => {
    if (ready && !needsSetup) loadAhead()
  }, [ready, needsSetup])
  useNativeLinks()
  useAndroidBack()
  useAppShortcuts(ready)

  // Wait for the session check (and any account-switch wipe) before rendering data.
  if (loading || (session && !userId)) return <LaunchScreen />

  // Signed out and hasn't chosen local-only mode: offer sign-in (never a dead end). `userId`
  // and not `session`: an account's data on this device shows before its session is checked.
  if (!userId && !localMode) return <LoginPage />

  // An account that has never saved a setting gets three short questions first (skippable, shown once).
  if (needsSetup) return <Suspense fallback={<LaunchScreen />}><WelcomePage /></Suspense>

  // Screens are code-split; the service worker precaches every chunk, so this still works offline.
  return (
    <Suspense fallback={<LaunchScreen />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="home" element={<HomePage />} />
          <Route path="workouts" element={<WorkoutsPage />} />
          <Route path="nutrition" element={<NutritionPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          {/* Can be bottom-bar tabs (Settings → Bottom bar), so they keep the bar */}
          <Route path="ranks" element={<RanksPage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
        </Route>
        {/* Full-screen — outside AppShell, no bottom nav */}
        <Route path="workouts/active" element={<ActiveWorkoutPage />} />
        <Route path="workouts/plan" element={<PlanPage />} />
        <Route path="workouts/history" element={<WorkoutHistoryPage />} />
        <Route path="nutrition/history" element={<NutritionHistoryPage />} />
        <Route path="workouts/routine/new" element={<RoutineEditPage />} />
        <Route path="workouts/routine/:id" element={<RoutineDetailPage />} />
        <Route path="workouts/routine/:id/edit" element={<RoutineEditPage />} />
        <Route path="workouts/summary/:id" element={<WorkoutSummaryPage />} />
        <Route path="leaderboard/:id" element={<FriendPage />} />
        <Route path="analytics/weight" element={<WeightLogPage />} />
        <Route path="recap" element={<RecapPage />} />
        <Route path="login" element={session ? <Navigate to="/settings" replace /> : <LoginPage embedded />} />
        {/* Old URLs from the previous layout */}
        <Route path="dashboard" element={<Navigate to="/home" replace />} />
        <Route path="stats/*" element={<Navigate to="/analytics" replace />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Wallpaper />
      <StatusBarScrim />
      <AppRoutes />
      <Toaster
        position="top-center"
        offset={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
        mobileOffset={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
      />
    </BrowserRouter>
  )
}
