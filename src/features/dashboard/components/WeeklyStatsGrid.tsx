import { Dumbbell, Weight, Timer, Flame, Footprints, Beef } from 'lucide-react'
import IconTile from '@/components/IconTile'
import { formatVolume } from '@/lib/workoutMath'
import type { DaySummary } from '../hooks/useWeekSummary'

interface Props {
  days: DaySummary[]
  /** Days up to and including today — averages ignore days that haven't happened yet. */
  elapsedDays: number
  workoutGoal: number
}

export default function WeeklyStatsGrid({ days, elapsedDays, workoutGoal }: Props) {
  const sum = (k: keyof Pick<DaySummary, 'workouts' | 'volume' | 'activeMin' | 'kcal' | 'steps' | 'protein'>) =>
    days.reduce((n, d) => n + d[k], 0)
  const loggedDays = days.filter(d => d.foodLogged).length
  const n = Math.max(1, elapsedDays)

  return (
    <div className="grid grid-cols-2 gap-3">
      <IconTile Icon={Dumbbell} label="Workouts this week" value={`${sum('workouts')} / ${workoutGoal}`} />
      <IconTile Icon={Weight} label="Volume lifted" value={formatVolume(sum('volume'))} />
      <IconTile Icon={Timer} label="Active minutes" value={String(Math.round(sum('activeMin')))} />
      <IconTile Icon={Footprints} label="Avg steps / day" value={Math.round(sum('steps') / n).toLocaleString()} />
      <IconTile Icon={Flame} label="Avg kcal (logged days)" value={loggedDays ? Math.round(sum('kcal') / loggedDays).toLocaleString() : '—'} />
      <IconTile Icon={Beef} label="Avg protein (logged days)" value={loggedDays ? `${Math.round(sum('protein') / loggedDays)} g` : '—'} />
    </div>
  )
}
