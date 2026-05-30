import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import AppShell from '@/components/AppShell'
import { useEffect } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import { useAuthStore } from '@/features/auth/authStore'
import { useSync } from '@/hooks/useSync'
import LoginPage from '@/features/auth/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import WorkoutsPage from '@/pages/WorkoutsPage'
import ActiveWorkoutPage from '@/pages/ActiveWorkoutPage'
import LogWorkoutPage from '@/pages/LogWorkoutPage'
import WorkoutHistoryPage from '@/pages/WorkoutHistoryPage'
import NutritionPage from '@/pages/NutritionPage'
import StatsPage from '@/pages/StatsPage'
import SettingsPage from '@/pages/SettingsPage'
import WeightLogPage from '@/features/bodyMetrics/WeightLogPage'
import AnalyticsPage from '@/pages/AnalyticsPage'

function AuthenticatedApp() {
  const { session, loading } = useAuth()
  const { setUserId } = useAuthStore()
  useSync(session?.user.id)

  useEffect(() => {
    setUserId(session?.user.id ?? null)
  }, [session, setUserId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) {
    return <LoginPage />
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="workouts" element={<WorkoutsPage />} />
        <Route path="workouts/history" element={<WorkoutHistoryPage />} />
        <Route path="nutrition" element={<NutritionPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      {/* Full-screen — outside AppShell, no bottom nav */}
      <Route path="workouts/active" element={<ActiveWorkoutPage />} />
      <Route path="workouts/log" element={<LogWorkoutPage />} />
      <Route path="stats/weight" element={<WeightLogPage />} />
      <Route path="stats/analytics" element={<AnalyticsPage />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthenticatedApp />
      <Toaster richColors position="top-center" />
    </BrowserRouter>
  )
}
