import { lazy, Suspense, useLayoutEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import AppShell from '@/components/AppShell'
import { useAuthInit } from '@/features/auth/useAuthInit'
import { useAuthStore } from '@/features/auth/authStore'
import LoginPage from '@/features/auth/LoginPage'
import HomePage from '@/pages/HomePage'
const WorkoutsPage = lazy(() => import('@/pages/WorkoutsPage'))
const WorkoutHistoryPage = lazy(() => import('@/pages/WorkoutHistoryPage'))
const RoutineDetailPage = lazy(() => import('@/pages/RoutineDetailPage'))
const RoutineEditPage = lazy(() => import('@/pages/RoutineEditPage'))
const ActiveWorkoutPage = lazy(() => import('@/pages/ActiveWorkoutPage'))
const WorkoutSummaryPage = lazy(() => import('@/pages/WorkoutSummaryPage'))
const PlanPage = lazy(() => import('@/pages/PlanPage'))
const NutritionPage = lazy(() => import('@/pages/NutritionPage'))
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const ChallengesPage = lazy(() => import('@/pages/ChallengesPage'))
const RanksPage = lazy(() => import('@/pages/RanksPage'))
const WeightLogPage = lazy(() => import('@/features/bodyMetrics/WeightLogPage'))

function Spinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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
  return <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[45] h-[env(safe-area-inset-top)] bg-background/90 backdrop-blur-xl" />
}

function AppRoutes() {
  useAuthInit()
  const session = useAuthStore(s => s.session)
  const userId = useAuthStore(s => s.userId)
  const loading = useAuthStore(s => s.loading)
  const localMode = useAuthStore(s => s.localMode)

  // Wait for the session check (and any account-switch wipe) before rendering data.
  if (loading || (session && !userId)) return <Spinner />

  // Signed out and hasn't chosen local-only mode: offer sign-in (never a dead end).
  if (!session && !localMode) return <LoginPage />

  // Screens are code-split; the service worker precaches every chunk, so this still works offline.
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="home" element={<HomePage />} />
          <Route path="workouts" element={<WorkoutsPage />} />
          <Route path="nutrition" element={<NutritionPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        {/* Full-screen — outside AppShell, no bottom nav */}
        <Route path="workouts/active" element={<ActiveWorkoutPage />} />
        <Route path="workouts/plan" element={<PlanPage />} />
        <Route path="workouts/history" element={<WorkoutHistoryPage />} />
        <Route path="workouts/routine/new" element={<RoutineEditPage />} />
        <Route path="workouts/routine/:id" element={<RoutineDetailPage />} />
        <Route path="workouts/routine/:id/edit" element={<RoutineEditPage />} />
        <Route path="workouts/summary/:id" element={<WorkoutSummaryPage />} />
        <Route path="challenges" element={<ChallengesPage />} />
        <Route path="ranks" element={<RanksPage />} />
        <Route path="analytics/weight" element={<WeightLogPage />} />
        <Route path="login" element={session ? <Navigate to="/profile" replace /> : <LoginPage embedded />} />
        {/* Old URLs from the previous layout */}
        <Route path="dashboard" element={<Navigate to="/home" replace />} />
        <Route path="settings" element={<Navigate to="/profile" replace />} />
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
