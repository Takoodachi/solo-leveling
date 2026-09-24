import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { Plus, SlidersHorizontal } from 'lucide-react'
import SectionHeader from '@/components/SectionHeader'
import type { HomeWidgetId, Routine } from '@/types'
import { useDailyLog } from '@/features/nutrition/hooks/useDailyLog'
import { useSettings, DEFAULT_STEP_GOAL } from '@/features/settings/hooks/useSettings'
import { useChallenges } from '@/features/challenges/hooks/useChallenges'
import ChallengeCard from '@/features/challenges/components/ChallengeCard'
import RankSummaryCard from '@/features/ranks/components/RankSummaryCard'
import LeaderboardCard from '@/features/leaderboard/components/LeaderboardCard'
import CreatineCard from '@/features/checkins/components/CreatineCard'
import WaterCard from '@/features/checkins/components/WaterCard'
import type { EffectiveTargets } from '../hooks/useEffectiveTargets'
import type { UseDynamicTargetsResult } from '../hooks/useDynamicTargets'
import { homeRows, homeWidgetsFrom } from '../homeWidgets'
import TodayWorkoutCard from './TodayWorkoutCard'
import { StepsCard, CaloriesCard } from './ActivityCards'
import MacrosCard from './MacrosCard'
import StreakLevelCard from './StreakLevelCard'

interface Props {
  selected: string
  today: string
  steps: number
  targets: EffectiveTargets
  dynamic: UseDynamicTargetsResult
  routine?: Routine
  completed: { uuid: string; name?: string }[]
  onCustomize: () => void
}

/** "Today's Plan": the cards the user picked, in their order (tiles pair up two per row). */
export default function TodayWidgets({ selected, today, steps, targets, dynamic, routine, completed, onCustomize }: Props) {
  const { settings } = useSettings()
  const { totals } = useDailyLog(selected)
  const challenges = useChallenges()
  if (!settings) return null // wait for the saved layout instead of flashing the default one

  const ids = homeWidgetsFrom(settings)
  const challenge = challenges?.find(c => c.status === 'active')

  function render(id: HomeWidgetId) {
    switch (id) {
      case 'workout':
        return <TodayWorkoutCard isToday={selected === today} isFuture={selected > today} routine={routine} completed={completed} />
      case 'steps':
        return <StepsCard date={selected} steps={steps} goal={settings?.dailyStepGoal ?? DEFAULT_STEP_GOAL} />
      case 'calories':
        return <CaloriesCard kcal={totals.kcal} target={targets.kcal} macros={totals} macroTargets={targets} />
      case 'water':
        return <WaterCard date={selected} today={today} />
      case 'creatine':
        return <CreatineCard date={selected} today={today} />
      case 'macros':
        return <MacrosCard totals={totals} targets={targets} dynamic={dynamic} />
      case 'challenge':
        return (
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
        )
      case 'rank':
        return <RankSummaryCard />
      case 'leaderboard':
        return <LeaderboardCard />
      case 'streak':
        return <StreakLevelCard />
    }
  }

  if (ids.length === 0) {
    return (
      <button type="button" onClick={onCustomize} className="flex items-center gap-3 rounded-3xl border border-dashed border-white/10 p-5 text-left text-muted-foreground">
        <SlidersHorizontal size={20} /> Your Home is empty. Tap to choose what to show.
      </button>
    )
  }

  return homeRows(ids).map(row =>
    row.length === 2 ? (
      <div key={row.join('+')} className="grid grid-cols-2 gap-3">
        {render(row[0])}
        {render(row[1])}
      </div>
    ) : (
      <Fragment key={row[0]}>{render(row[0])}</Fragment>
    ),
  )
}
