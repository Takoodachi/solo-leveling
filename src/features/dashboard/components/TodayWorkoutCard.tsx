import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, Moon, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Routine } from '@/types'
import { tickCheckin, toggleCheckin, useCheckin } from '@/features/checkins/useCheckins'
import { CATEGORY_META, LEVEL_META } from '@/features/workouts/categories'
import RoutineArt from '@/features/workouts/components/RoutineArt'
import { useActiveWorkout } from '@/features/workouts/hooks/useActiveWorkout'
import { useRoutineMinutes } from '@/features/workouts/hooks/useExercises'
import { useWorkoutStore } from '@/features/workouts/store'
import { toneStyle, usePhotoTone } from '@/features/workouts/photoTone'

interface Props {
  /** The day on show (YYYY-MM-DD): Skip applies to it. */
  date: string
  isToday: boolean
  isFuture: boolean
  routine?: Routine
  completed: { uuid: string; name?: string }[]
}

export default function TodayWorkoutCard({ date, isToday, isFuture, routine, completed }: Props) {
  const navigate = useNavigate()
  const { startFromRoutine } = useActiveWorkout()
  const minutesFor = useRoutineMinutes()
  const hasDraft = useWorkoutStore(s => !!s.draft)
  const tone = usePhotoTone(routine?.image, 'left')
  const skipped = useCheckin('skip', date)

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
      <RestCard title={isToday ? 'Nothing planned today' : 'Rest day'} note={isToday ? 'Recover, or train anyway.' : 'No workout scheduled.'}>
        {isToday && !hasDraft && <Button size="sm" variant="secondary" onClick={() => navigate('/workouts?start=1')}>Train</Button>}
      </RestCard>
    )
  }

  // Skipped: the plan steps aside for the day (no dot on the week strip, no reminder) until undone
  if (skipped) {
    return (
      <RestCard title={`${routine.name} skipped`} note={isToday ? 'Rest up, or train anyway.' : 'A rest day instead.'}>
        <Button size="sm" variant="secondary" onClick={() => void toggleCheckin('skip', date)}>Undo</Button>
      </RestCard>
    )
  }

  const cat = CATEGORY_META[routine.category]
  const lvl = LEVEL_META[routine.level]
  const canStart = isToday && !hasDraft
  return (
    <div className="relative overflow-hidden rounded-3xl bg-card p-5 text-foreground" style={toneStyle(tone)}>
      <RoutineArt category={routine.category} image={routine.image} />
      <div className="relative flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <Badge variant="tag" className="w-fit gap-1.5"><cat.Icon size={13} />{isFuture ? 'Planned' : 'Today'}</Badge>
          {(canStart || isFuture) && (
            <Button size="sm" variant="ghost" className="-my-2 -mr-2" onClick={() => void tickCheckin('skip', date)}>Skip</Button>
          )}
        </div>
        <Link to={`/workouts/routine/${routine.uuid}`} className="mt-4 text-lg font-semibold leading-tight">{routine.name}</Link>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-sm text-foreground/85">
            <span className="flex items-center gap-1.5"><lvl.Icon size={16} className="text-foreground/70" />{lvl.label}</span>
            <span className="flex items-center gap-1.5"><Clock size={15} className="text-foreground/70" />{minutesFor(routine)} min</span>
          </div>
          {canStart && <Button size="sm" onClick={() => void startFromRoutine(routine)}>Start</Button>}
        </div>
      </div>
    </div>
  )
}

/** A day without a workout to start: nothing planned, a rest day, or a skipped one. */
function RestCard({ title, note, children }: { title: string; note: string; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-4 rounded-3xl bg-card p-5">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary"><Moon size={22} className="text-muted-foreground" /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{note}</p>
      </div>
      {children}
    </div>
  )
}
