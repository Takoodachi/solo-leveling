import { useNavigate } from 'react-router-dom'
import { Dumbbell, Flame, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import MacroRing from '@/components/MacroRing'
import StatCard from '@/components/StatCard'
import MacroBar from '@/features/nutrition/components/MacroBar'
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData'
import { useWorkoutStore } from '@/features/workouts/store'
import { formatDisplayDate } from '@/lib/date'
import { clampPercent, formatDurationMin } from '@/lib/format'

function xpForLevel(n: number): number {
  return Math.round(100 * Math.pow(n, 1.5))
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { startWorkout } = useWorkoutStore()
  const { nutritionTotals, targets, userStats, todayWorkout, todayStr } = useDashboardData()

  const kcalTarget = targets?.dailyKcal ?? 2000
  const proteinTarget = targets?.dailyProtein ?? 150
  const carbsTarget = targets?.dailyCarbs ?? 200
  const fatTarget = targets?.dailyFat ?? 65

  const level = userStats?.level ?? 1
  const xp = userStats?.xp ?? 0
  const xpNeeded = xpForLevel(level)
  const xpPercent = clampPercent(xp, xpNeeded)
  const streak = userStats?.currentStreak ?? 0

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  function handleStartWorkout() {
    startWorkout()
    navigate('/workouts/active')
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold">{greeting} 👋</h1>
        <p className="text-sm text-muted-foreground">{formatDisplayDate(todayStr)}</p>
      </div>

      {/* Calories ring + macros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <MacroRing consumed={nutritionTotals.kcal} target={kcalTarget} className="shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
              <MacroBar label="Protein" value={nutritionTotals.protein} target={proteinTarget} colorClass="text-blue-400" />
              <MacroBar label="Carbs"   value={nutritionTotals.carbs}   target={carbsTarget}   colorClass="text-orange-400" />
              <MacroBar label="Fat"     value={nutritionTotals.fat}     target={fatTarget}     colorClass="text-yellow-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's workout */}
      {todayWorkout ? (
        <StatCard
          label="Today's workout"
          value={formatDurationMin(todayWorkout.durationMin)}
          sub="Completed"
          Icon={Dumbbell}
          iconClassName="text-primary"
        />
      ) : (
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Dumbbell size={20} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No workout yet today</p>
            </div>
            <Button size="sm" onClick={handleStartWorkout}>
              Start
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Streak + Level row */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Streak"
          value={`${streak} day${streak !== 1 ? 's' : ''}`}
          Icon={Flame}
          iconClassName={streak > 0 ? 'text-orange-400' : 'text-muted-foreground'}
        />
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted shrink-0">
              <Star size={20} className="text-yellow-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Level {level}</p>
              <Progress value={xpPercent} className="h-2 mt-1" />
              <p className="text-xs text-muted-foreground mt-0.5">{xp} / {xpNeeded} XP</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
