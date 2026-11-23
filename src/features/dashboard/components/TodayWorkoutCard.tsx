import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { CheckCircle2, Moon, Clock, CirclePause, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Routine } from '@/types'
import { tickCheckin, toggleCheckin, useCheckin } from '@/features/checkins/useCheckins'
import { CATEGORY_META, LEVEL_META } from '@/features/workouts/categories'
import RoutineArt from '@/features/workouts/components/RoutineArt'
import { useActiveWorkout } from '@/features/workouts/hooks/useActiveWorkout'
import { useRoutineMinutes } from '@/features/workouts/hooks/useExercises'
import type { WorkoutSummary } from '@/features/workouts/hooks/useWorkoutHistory'
import { useWorkoutStore } from '@/features/workouts/store'
import { usePausedUntil } from '@/features/workouts/pause'
import { PauseActions } from '@/features/workouts/components/PauseTraining'
import { toneStyle, usePhotoTone } from '@/features/workouts/photoTone'

/** A workout finished on the day on show. */
export type CompletedWorkout = Pick<WorkoutSummary, 'uuid' | 'name' | 'createdAt' | 'setCount' | 'stretchSetCount'>

interface Props {
  /** The day on show (YYYY-MM-DD): Skip applies to it. */
  date: string
  isToday: boolean
  isFuture: boolean
  routine?: Routine
  /** The user's own stretching routine: once the day's workout is done, it's what comes next. */
  stretchRoutine?: Routine
  completed: CompletedWorkout[]
}

/** A session of nothing but stretches: it doesn't finish the day's workout. */
const stretchOnly = (w: CompletedWorkout) => w.setCount > 0 && w.stretchSetCount === w.setCount

/** Where "stretch?" goes for someone without a stretching routine: the stretching templates. */
const STRETCH_TEMPLATES = '/workouts?category=stretching'

export default function TodayWorkoutCard({ date, isToday, isFuture, routine, stretchRoutine, completed }: Props) {
  const navigate = useNavigate()
  const hasDraft = useWorkoutStore(s => !!s.draft)
  const skipped = useCheckin('skip', date)
  const pausedTill = usePausedUntil(date)
  const last = completed.filter(w => !stretchOnly(w)).sort((a, b) => a.createdAt - b.createdAt).at(-1)
  // Trained today, and nothing stretched in any of today's workouts yet
  const stretchDue = isToday && !!last && !completed.some(w => w.stretchSetCount > 0)
  // Only a stretch so far today with a workout still planned: a morning stretch doesn't finish the day
  const stillPlanned = isToday && !last && !!routine && !skipped && !pausedTill && routine.category !== 'stretching'

  if (completed.length > 0 && !stillPlanned) {
    if (stretchDue && last && stretchRoutine) {
      return (
        <PlanCard routine={stretchRoutine} label="Stretch next" canStart={!hasDraft}>
          <Link to={`/workouts/summary/${last.uuid}`} className="flex min-w-0 items-center gap-1.5 text-sm text-foreground/80">
            <CheckCircle2 size={15} className="shrink-0 text-primary" />
            <span className="truncate">{last.name ?? 'Workout'} done · view summary</span>
          </Link>
        </PlanCard>
      )
    }
    return <Completed rows={completed} nudge={stretchDue ? last?.uuid : undefined} />
  }

  // Training paused: no plan on any of its days, until it comes back by itself (pause.ts)
  if (pausedTill) {
    return (
      <RestCard
        Icon={CirclePause}
        title="Training paused"
        note={`Back to your plan on ${format(parseISO(pausedTill), 'EEE, MMM d')}`}
        footer={(isToday || isFuture) && <PauseActions until={pausedTill} className="mt-4" />}
      />
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

  const canStart = isToday && !hasDraft
  const plan = (
    <PlanCard
      routine={routine}
      label={isFuture ? 'Planned' : 'Today'}
      canStart={canStart}
      onSkip={canStart || isFuture ? () => void tickCheckin('skip', date) : undefined}
    />
  )
  return stillPlanned ? <div className="flex flex-col gap-2">{plan}<Completed rows={completed} /></div> : plan
}

/** A routine to do: the day's plan, or the stretch that follows it (`children` goes under it). */
function PlanCard({ routine, label, canStart, onSkip, children }: { routine: Routine; label: string; canStart: boolean; onSkip?: () => void; children?: ReactNode }) {
  const { startFromRoutine } = useActiveWorkout()
  const minutesFor = useRoutineMinutes()
  const tone = usePhotoTone(routine.image, 'left')
  const cat = CATEGORY_META[routine.category]
  const lvl = LEVEL_META[routine.level]
  return (
    <div className="relative overflow-hidden rounded-3xl bg-card p-5 text-foreground" style={toneStyle(tone)}>
      <RoutineArt category={routine.category} image={routine.image} />
      <div className="relative flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <Badge variant="tag" className="w-fit gap-1.5"><cat.Icon size={13} />{label}</Badge>
          {onSkip && <Button size="sm" variant="ghost" className="-my-2 -mr-2" onClick={onSkip}>Skip</Button>}
        </div>
        <Link to={`/workouts/routine/${routine.uuid}`} className="mt-4 text-lg font-semibold leading-tight">{routine.name}</Link>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-sm text-foreground/85">
            <span className="flex items-center gap-1.5"><lvl.Icon size={16} className="text-foreground/70" />{lvl.label}</span>
            <span className="flex items-center gap-1.5"><Clock size={15} className="text-foreground/70" />{minutesFor(routine)} min</span>
          </div>
          {canStart && <Button size="sm" onClick={() => void startFromRoutine(routine)}>Start</Button>}
        </div>
        {children}
      </div>
    </div>
  )
}

/** The day's finished workouts, each opening its summary; the one named by `nudge` asks "stretch?". */
function Completed({ rows, nudge }: { rows: CompletedWorkout[]; nudge?: string }) {
  return (
    <div className="flex flex-col gap-2">
      {rows.map(w => (
        <div key={w.uuid} className="press relative flex items-center gap-3 rounded-3xl bg-card p-4">
          <CheckCircle2 size={24} className="shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            {/* The whole card opens the summary (the link's ::after covers it); "stretch?" sits above that */}
            <Link to={`/workouts/summary/${w.uuid}`} className="block truncate font-semibold after:absolute after:inset-0 after:rounded-3xl">
              {w.name ?? 'Workout'}
            </Link>
            <p className="text-sm text-muted-foreground">
              Completed · view summary
              {w.uuid === nudge && (
                <> · <Link to={STRETCH_TEMPLATES} className="relative z-10 py-3 font-semibold text-primary">stretch?</Link></>
              )}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

/** A day without a workout to start: nothing planned, a rest day, a skipped one or training paused (`children` beside the text, `footer` under it). */
function RestCard({ Icon = Moon, title, note, children, footer }: { Icon?: LucideIcon; title: string; note: string; children?: ReactNode; footer?: ReactNode }) {
  return (
    <div className="rounded-3xl bg-card p-5">
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary"><Icon size={22} className="text-muted-foreground" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{note}</p>
        </div>
        {children}
      </div>
      {footer}
    </div>
  )
}
