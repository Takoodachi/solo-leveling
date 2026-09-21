import { Dumbbell, Weight, Timer, Flame, Footprints, Beef, type LucideIcon } from 'lucide-react'
import { formatVolume } from '@/lib/workoutMath'
import type { DaySummary } from '../hooks/useWeekSummary'

interface Props {
  days: DaySummary[]
  /** Days up to and including today — averages ignore days that haven't happened yet. */
  elapsedDays: number
  workoutGoal: number
}

function Tile({ Icon, label, value }: { Icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-card p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary"><Icon size={18} /></span>
      <div>
        <p className="text-lg font-semibold tabular-nums leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

export default function WeeklyStatsGrid({ days, elapsedDays, workoutGoal }: Props) {
  const sum = (k: keyof Pick<DaySummary, 'workouts' | 'volume' | 'activeMin' | 'kcal' | 'steps' | 'protein'>) =>
    days.reduce((n, d) => n + d[k], 0)
  const loggedDays = days.filter(d => d.foodLogged).length
  const n = Math.max(1, elapsedDays)

  return (
    <div className="grid grid-cols-2 gap-3">
      <Tile Icon={Dumbbell} label="Workouts this week" value={`${sum('workouts')} / ${workoutGoal}`} />
      <Tile Icon={Weight} label="Volume lifted" value={formatVolume(sum('volume'))} />
      <Tile Icon={Timer} label="Active minutes" value={String(Math.round(sum('activeMin')))} />
      <Tile Icon={Footprints} label="Avg steps / day" value={Math.round(sum('steps') / n).toLocaleString()} />
      <Tile Icon={Flame} label="Avg kcal (logged days)" value={loggedDays ? Math.round(sum('kcal') / loggedDays).toLocaleString() : '—'} />
      <Tile Icon={Beef} label="Avg protein (logged days)" value={loggedDays ? `${Math.round(sum('protein') / loggedDays)} g` : '—'} />
    </div>
  )
}
