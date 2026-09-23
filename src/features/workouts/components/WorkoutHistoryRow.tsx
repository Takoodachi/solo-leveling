import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ChevronRight } from 'lucide-react'
import { formatKm } from '@/lib/cardio'
import type { WorkoutSummary } from '../hooks/useWorkoutHistory'

export default function WorkoutHistoryRow({ workout }: { workout: WorkoutSummary }) {
  const date = parseISO(workout.date)
  return (
    <Link
      to={`/workouts/summary/${workout.uuid}`}
      className="flex items-center gap-4 rounded-2xl bg-card p-3 pr-4 transition-colors hover:bg-accent/60"
    >
      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-secondary">
        <span className="text-lg font-bold leading-none">{format(date, 'd')}</span>
        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{format(date, 'MMM')}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{workout.name ?? 'Workout'}</p>
        <p className="truncate text-xs text-muted-foreground">
          {[
            workout.exerciseNames.length === 1 ? workout.exerciseNames[0] : `${workout.exerciseNames.length} exercises`,
            workout.liftSetCount > 0 ? `${workout.liftSetCount} sets` : null,
            workout.distanceKm > 0 ? formatKm(workout.distanceKm) : null,
            `${workout.durationMin} min`,
          ].filter(Boolean).join(' · ')}
        </p>
      </div>
      <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
    </Link>
  )
}
