import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import Segmented from '@/components/Segmented'
import SectionHeader from '@/components/SectionHeader'
import { useNow } from '@/hooks/useNow'
import { toDateStr, weekDates } from '@/lib/date'
import { parseISO } from 'date-fns'
import { useDailyLog } from '@/features/nutrition/hooks/useDailyLog'
import { useSettings, DEFAULT_STEP_GOAL } from '@/features/settings/hooks/useSettings'
import { useRoutines } from '@/features/workouts/hooks/useRoutines'
import { useWorkoutList } from '@/features/workouts/hooks/useWorkoutHistory'
import ResumeBanner from '@/features/workouts/components/ResumeBanner'
import { useChallenges } from '@/features/challenges/hooks/useChallenges'
import ChallengeCard from '@/features/challenges/components/ChallengeCard'
import { useEffectiveTargets } from '@/features/dashboard/hooks/useEffectiveTargets'
import { useWeekSummary } from '@/features/dashboard/hooks/useWeekSummary'
import HomeHeader from '@/features/dashboard/components/HomeHeader'
import WeekStrip from '@/features/dashboard/components/WeekStrip'
import TodayWorkoutCard from '@/features/dashboard/components/TodayWorkoutCard'
import { StepsCard, CaloriesCard } from '@/features/dashboard/components/ActivityCards'
import MacrosCard from '@/features/dashboard/components/MacrosCard'
import StreakLevelCard from '@/features/dashboard/components/StreakLevelCard'
import WeeklyOverviewCard from '@/features/dashboard/components/WeeklyOverviewCard'
import WeeklyStatsGrid from '@/features/dashboard/components/WeeklyStatsGrid'
import RankSummaryCard from '@/features/ranks/components/RankSummaryCard'
import CreatineCard from '@/features/checkins/components/CreatineCard'

type Tab = 'today' | 'week'
const TABS = [{ value: 'today', label: 'Today’s Plan' }, { value: 'week', label: 'Weekly Stats' }] as const

export default function HomePage() {
  const now = useNow()
  const todayStr = toDateStr(now)
  const [tab, setTab] = useState<Tab>('today')
  const [picked, setPicked] = useState<string | null>(null)
  const week = weekDates(now)
  const selected = picked && week.includes(picked) ? picked : todayStr

  const days = useWeekSummary(week)
  const routines = useRoutines()
  const workouts = useWorkoutList(30)
  const challenges = useChallenges()
  const { settings } = useSettings()
  const { totals } = useDailyLog(selected)
  const { targets, dynamic } = useEffectiveTargets(selected)

  const day = days?.find(d => d.date === selected)
  const weekday = parseISO(selected).getDay()
  const scheduled = new Set(routines.flatMap(r => r.scheduleDays))
  const routine = routines.find(r => r.scheduleDays.includes(weekday))
  const completed = (workouts ?? []).filter(w => w.date === selected)
  const challenge = challenges?.find(c => c.status === 'active')

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
          <TodayWorkoutCard isToday={selected === todayStr} isFuture={selected > todayStr} routine={routine} completed={completed} />

          <section className="flex flex-col gap-3">
            <SectionHeader actionLabel="Nutrition" to="/nutrition">Your activity</SectionHeader>
            <div className="grid grid-cols-2 gap-3">
              <StepsCard date={selected} steps={day?.steps ?? 0} goal={settings?.dailyStepGoal ?? DEFAULT_STEP_GOAL} />
              <CaloriesCard kcal={totals.kcal} target={targets.kcal} macros={totals} macroTargets={targets} />
            </div>
            <MacrosCard totals={totals} targets={targets} dynamic={dynamic} />
            {settings?.creatineEnabled !== false && <CreatineCard date={selected} today={todayStr} />}
          </section>

          <section className="flex flex-col gap-3">
            <SectionHeader actionLabel="View all" to="/challenges">Challenges</SectionHeader>
            {challenge ? (
              <Link to="/challenges" className="block"><ChallengeCard challenge={challenge} /></Link>
            ) : (
              <Link to="/challenges" className="flex items-center gap-3 rounded-3xl border border-dashed border-white/10 p-5 text-muted-foreground">
                <Plus size={20} /> Set yourself a personal challenge
              </Link>
            )}
          </section>

          <RankSummaryCard />
          <StreakLevelCard />
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
