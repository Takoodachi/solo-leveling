import { useState } from 'react'
import Segmented from '@/components/Segmented'
import SectionHeader from '@/components/SectionHeader'
import { useNow } from '@/hooks/useNow'
import { formatDisplayDate, toDateStr, weekDates } from '@/lib/date'
import { parseISO } from 'date-fns'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { useRoutines } from '@/features/workouts/hooks/useRoutines'
import { useWorkoutList } from '@/features/workouts/hooks/useWorkoutHistory'
import ResumeBanner from '@/features/workouts/components/ResumeBanner'
import { useEffectiveTargets } from '@/features/dashboard/hooks/useEffectiveTargets'
import { useWeekSummary } from '@/features/dashboard/hooks/useWeekSummary'
import HomeHeader from '@/features/dashboard/components/HomeHeader'
import WeekStrip from '@/features/dashboard/components/WeekStrip'
import TodayWidgets from '@/features/dashboard/components/TodayWidgets'
import CustomizeHomeSheet from '@/features/dashboard/components/CustomizeHomeSheet'
import WeeklyOverviewCard from '@/features/dashboard/components/WeeklyOverviewCard'
import WeeklyStatsGrid from '@/features/dashboard/components/WeeklyStatsGrid'

type Tab = 'today' | 'week'
const TABS = [{ value: 'today', label: 'Today’s Plan' }, { value: 'week', label: 'Weekly Stats' }] as const

export default function HomePage() {
  const now = useNow()
  const todayStr = toDateStr(now)
  const [tab, setTab] = useState<Tab>('today')
  const [picked, setPicked] = useState<string | null>(null)
  const [customizing, setCustomizing] = useState(false)
  const week = weekDates(now)
  const selected = picked && week.includes(picked) ? picked : todayStr

  const days = useWeekSummary(week)
  const routines = useRoutines()
  const workouts = useWorkoutList(30)
  const { settings } = useSettings()
  const { targets, dynamic } = useEffectiveTargets(selected)

  const day = days?.find(d => d.date === selected)
  const weekday = parseISO(selected).getDay()
  const scheduled = new Set(routines.flatMap(r => r.scheduleDays))
  const routine = routines.find(r => r.scheduleDays.includes(weekday))
  const completed = (workouts ?? []).filter(w => w.date === selected)

  return (
    <div className="flex flex-col gap-5">
      <HomeHeader />
      <Segmented value={tab} options={TABS} onChange={setTab} className="mt-2" />

      {days && (
        <WeekStrip
          days={days}
          selected={selected}
          today={todayStr}
          kcalTarget={targets.kcal}
          scheduledWeekdays={scheduled}
          onSelect={setPicked}
        />
      )}

      {tab === 'today' ? (
        <>
          <ResumeBanner />
          <SectionHeader actionLabel="Customize" onAction={() => setCustomizing(true)}>{formatDisplayDate(selected)}</SectionHeader>
          <TodayWidgets
            selected={selected}
            today={todayStr}
            steps={day?.steps ?? 0}
            targets={targets}
            dynamic={dynamic}
            routine={routine}
            completed={completed}
            onCustomize={() => setCustomizing(true)}
          />
          <CustomizeHomeSheet open={customizing} onOpenChange={setCustomizing} />
        </>
      ) : (
        days && (
          <>
            <WeeklyOverviewCard days={days} today={todayStr} />
            <WeeklyStatsGrid
              days={days}
              elapsedDays={week.filter(d => d <= todayStr).length}
              workoutGoal={settings?.weeklyWorkoutGoal ?? Math.max(3, scheduled.size)}
            />
          </>
        )
      )}
    </div>
  )
}
