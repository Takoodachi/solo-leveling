import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, Moon, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Routine } from '@/types'
import { CATEGORY_META, LEVEL_META } from '@/features/workouts/categories'
import RoutineArt from '@/features/workouts/components/RoutineArt'
import { useActiveWorkout } from '@/features/workouts/hooks/useActiveWorkout'
import { useRoutineMinutes } from '@/features/workouts/hooks/useExercises'
import { useWorkoutStore } from '@/features/workouts/store'

interface Props {
  isToday: boolean
  isFuture: boolean
  routine?: Routine
  completed: { uuid: string; name?: string }[]
}

export default function TodayWorkoutCard({ isToday, isFuture, routine, completed }: Props) {
  const navigate = useNavigate()
  const { startFromRoutine } = useActiveWorkout()
  const minutesFor = useRoutineMinutes()
  const hasDraft = useWorkoutStore(s => !!s.draft)

  if (completed.length > 0) {
    return (
      <div className="flex flex-col gap-2">
        {completed.map(w => (
          <Link key={w.uuid} to={`/workouts/summary/${w.uuid}`} className="flex items-center gap-3 rounded-3xl bg-card p-4">
            <CheckCircle2 size={24} className="text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{w.name ?? 'Workout'}</p>
              <p className="text-sm text-muted-foreground">Completed · view summary</p>
            </div>
          </Link>
        ))}
      </div>
    )
  }

  if (!routine) {
    return (
      <div className="flex items-center gap-4 rounded-3xl bg-card p-5">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary"><Moon size={22} className="text-muted-foreground" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{isToday ? 'Nothing planned today' : 'Rest day'}</p>
          <p className="text-sm text-muted-foreground">{isToday ? 'Recover, or train anyway.' : 'No workout scheduled.'}</p>
        </div>
        {isToday && !hasDraft && <Button size="sm" variant="secondary" onClick={() => navigate('/workouts?start=1')}>Train</Button>}
      </div>
    )
  }

  const cat = CATEGORY_META[routine.category]
  const lvl = LEVEL_META[routine.level]
  return (
    <div className="relative overflow-hidden rounded-3xl bg-card p-5">
      <RoutineArt category={routine.category} />
      <div className="relative flex flex-col gap-3">
        <Badge variant="tag" className="w-fit gap-1.5"><cat.Icon size={13} />{isFuture ? 'Planned' : 'Today'}</Badge>
        <Link to={`/workouts/routine/${routine.uuid}`} className="mt-4 text-lg font-semibold leading-tight">{routine.name}</Link>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-sm text-foreground/85">
            <span className="flex items-center gap-1.5"><lvl.Icon size={16} className="text-foreground/70" />{lvl.label}</span>
            <span className="flex items-center gap-1.5"><Clock size={15} className="text-foreground/70" />{minutesFor(routine)} min</span>
          </div>
          {isToday && !hasDraft && <Button size="sm" onClick={() => void startFromRoutine(routine)}>Start</Button>}
        </div>
      </div>
    </div>
  )
}
