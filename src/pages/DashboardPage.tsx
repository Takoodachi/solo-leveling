import { useState, useEffect } from 'react'
import { Flame, Star, Info } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import MacroRing from '@/components/MacroRing'
import StatCard from '@/components/StatCard'
import MacroBar from '@/features/nutrition/components/MacroBar'
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData'
import { useDynamicTargets } from '@/features/dashboard/hooks/useDynamicTargets'
import StepLogCard from '@/features/dashboard/components/StepLogCard'
import TargetBreakdownSheet from '@/features/dashboard/components/TargetBreakdownSheet'
import { clampPercent } from '@/lib/format'
import { xpForLevel } from '@/lib/xp'
import { format, parseISO } from 'date-fns'

export default function DashboardPage() {
  const { nutritionTotals, targets, userStats, todayStr } = useDashboardData()
  const dyn = useDynamicTargets()
  const [breakdownOpen, setBreakdownOpen] = useState(false)

  const kcalTarget    = dyn.dynamic && dyn.targets ? dyn.targets.kcal    : (targets?.dailyKcal    ?? 2000)
  const proteinTarget = dyn.dynamic && dyn.targets ? dyn.targets.protein : (targets?.dailyProtein ?? 150)
  const carbsTarget   = dyn.dynamic && dyn.targets ? dyn.targets.carbs   : (targets?.dailyCarbs   ?? 200)
  const fatTarget     = dyn.dynamic && dyn.targets ? dyn.targets.fat     : (targets?.dailyFat     ?? 65)

  const level = userStats?.level ?? 1
  const xp = userStats?.xp ?? 0
  const xpNeeded = xpForLevel(level)
  const streak = userStats?.currentStreak ?? 0

  const xpPercentTarget = clampPercent(xp, xpNeeded)
  const [xpPercent, setXpPercent] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setXpPercent(xpPercentTarget), 100)
    return () => clearTimeout(t)
  }, [xpPercentTarget])

  const today = parseISO(todayStr)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="p-4 flex flex-col gap-5">
      {/* Greeting hero */}
      <div className="pt-2">
        <p className="text-sm font-medium text-primary mb-0.5">{format(today, 'EEEE, MMM d')}</p>
        <h1 className="text-2xl font-bold tracking-tight">{greeting}</h1>
      </div>

      {/* Calories ring + macros */}
      <Card>
        <CardContent className="p-4">
          {dyn.dynamic && dyn.breakdown && (
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">
                Today's target
                {dyn.breakdown.activityAvg > 0 && (
                  <span className="ml-1 text-primary">+{dyn.breakdown.activityAvg} kcal</span>
                )}
              </p>
              <button
                onClick={() => setBreakdownOpen(true)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="View target breakdown"
              >
                <Info size={14} />
              </button>
            </div>
          )}
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

      {dyn.dynamic && <StepLogCard />}

      {dyn.dynamic && dyn.targets && dyn.breakdown && (
        <TargetBreakdownSheet
          open={breakdownOpen}
          onClose={() => setBreakdownOpen(false)}
          targets={dyn.targets}
          breakdown={dyn.breakdown}
        />
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
