import { Suspense, useState } from 'react'
import Segmented from '@/components/Segmented'
import SectionHeader from '@/components/SectionHeader'
import { useNow } from '@/hooks/useNow'
import { formatDisplayDate, toDateStr, weekDates } from '@/lib/date'
import { parseISO } from 'date-fns'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarDays, ChevronRight } from 'lucide-react'
import DatePicker from '@/components/DatePicker'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { useRoutines } from '@/features/workouts/hooks/useRoutines'
import { useWorkoutList } from '@/features/workouts/hooks/useWorkoutHistory'
import ResumeBanner from '@/features/workouts/components/ResumeBanner'
import { netKcal, useCalorieBudget } from '@/features/dashboard/hooks/useCalorieBudget'
import { useWeekSummary } from '@/features/dashboard/hooks/useWeekSummary'
import HomeHeader from '@/features/dashboard/components/HomeHeader'
import WeekStrip from '@/features/dashboard/components/WeekStrip'
import TodayWidgets from '@/features/dashboard/components/TodayWidgets'
import CustomizeHomeSheet from '@/features/dashboard/components/CustomizeHomeSheet'
import WeeklyStatsGrid from '@/features/dashboard/components/WeeklyStatsGrid'
import HomeSearch from '@/features/search/components/HomeSearch'
import RecapBanner from '@/features/recap/components/RecapBanner'
import LogStepsSheet from '@/features/dashboard/components/LogStepsSheet'
import WaterSheet from '@/features/checkins/components/WaterSheet'
import { lazyAhead } from '@/lib/lazyAhead'

// It draws a chart, and the chart library is a fifth of the app: not part of what Home needs to open
const WeeklyOverviewCard = lazyAhead(() => import('@/features/dashboard/components/WeeklyOverviewCard'))

type Tab = 'today' | 'week'
const TABS = [{ value: 'today', label: 'Today’s Plan' }, { value: 'week', label: 'Weekly Stats' }] as const

export default function HomePage() {
  const now = useNow()
  const todayStr = toDateStr(now)
  const [tab, setTab] = useState<Tab>('today')
  const [picked, setPicked] = useState<string | null>(null)
  const [customizing, setCustomizing] = useState(false)
  const [searching, setSearching] = useState(false)
  // /home?log=steps or ?log=water (a long-press shortcut on the app icon) opens that sheet
  const [params, setParams] = useSearchParams()
  const logging = params.get('log')
  const doneLogging = (open: boolean) => { if (!open) setParams({}, { replace: true }) }
  // Any day can be on show (the calendar by the date) and the strip is that day's week; until
  // one is picked it follows the clock
  const selected = picked ?? todayStr
  const week = weekDates(parseISO(selected))
  const pick = (day: string) => setPicked(day === todayStr ? null : day)

  const days = useWeekSummary(week)
  const routines = useRoutines()
  const completed = useWorkoutList(1000, selected) ?? []
  const { settings } = useSettings()
  const budget = useCalorieBudget(selected)

  const day = days?.find(d => d.date === selected)
  const weekday = parseISO(selected).getDay()
  const scheduled = new Set(routines.flatMap(r => r.scheduleDays))
  const routine = routines.find(r => r.scheduleDays.includes(weekday))
  const showSearch = settings?.showSearch !== false
  const kcalProgress = budget.targets.kcal > 0 ? netKcal(day?.kcal ?? 0, budget.burn) / budget.targets.kcal : 0

  return (
    <div className="flex flex-col gap-5">
      <HomeHeader />
      {showSearch && (
        <HomeSearch open={searching} onOpenChange={setSearching} onCustomize={() => setCustomizing(true)} />
      )}
      <CustomizeHomeSheet open={customizing} onOpenChange={setCustomizing} />
      <LogStepsSheet open={logging === 'steps'} onOpenChange={doneLogging} />
      <WaterSheet open={logging === 'water'} onOpenChange={doneLogging} date={todayStr} today={todayStr} />
      {!searching && (
        <div className="flex animate-fade-in flex-col gap-5">
          <Segmented value={tab} options={TABS} onChange={setTab} className={showSearch ? undefined : 'mt-2'} />

          {days && (
            <WeekStrip
              days={days}
              selected={selected}
              today={todayStr}
              kcalProgress={kcalProgress}
              scheduledWeekdays={scheduled}
              onSelect={pick}
            />
          )}

          {tab === 'today' ? (
            <div key="today" className="flex animate-fade-in flex-col gap-5">
              <ResumeBanner />
              <RecapBanner now={now} />
              <SectionHeader actionLabel="Customize" onAction={() => setCustomizing(true)}>
                <DatePicker
                  value={selected}
                  onChange={pick}
                  max={weekDates(now)[6]}
                  aria-label={`${formatDisplayDate(selected)}: pick another day`}
                  className="-my-2 -ml-2 flex h-11 items-center gap-2 rounded-full px-2 hover:bg-accent"
                >
                  {formatDisplayDate(selected)}
                  <CalendarDays size={18} className="text-muted-foreground" />
                </DatePicker>
              </SectionHeader>
              <TodayWidgets
                selected={selected}
                today={todayStr}
                steps={day?.steps ?? 0}
                budget={budget}
                routine={routine}
                completed={completed}
                onCustomize={() => setCustomizing(true)}
              />
            </div>
          ) : (
            days && (
              <div key="week" className="flex animate-fade-in flex-col gap-5">
                <Suspense fallback={<div className="h-72 rounded-3xl bg-card" />}>
                  <WeeklyOverviewCard days={days} today={todayStr} />
                </Suspense>
                <WeeklyStatsGrid
                  days={days}
                  elapsedDays={week.filter(d => d <= todayStr).length}
                  workoutGoal={settings?.weeklyWorkoutGoal ?? Math.max(3, scheduled.size)}
                />
                <Link to="/recap" className="flex items-center justify-between rounded-3xl bg-card px-5 py-4 font-medium hover:bg-accent">
                  Last week’s recap <ChevronRight size={18} className="text-muted-foreground" />
                </Link>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
