import { Clock, Dumbbell, Play } from 'lucide-react'
import type { Exercise, RoutineExercise } from '@/types'
import { exerciseMinutes, setModeFor } from '@/lib/workoutMath'

interface Props {
  index: number
  item: RoutineExercise
  exercise?: Exercise
  onOpen: () => void
}

/** Exercise row on the routine detail screen, with a media placeholder thumbnail. */
export default function RoutineExerciseCard({ index, item, exercise, onOpen }: Props) {
  const minutes = Math.max(1, Math.round(exerciseMinutes(item, exercise)))
  const unit = exercise && setModeFor(exercise) === 'time' ? ' min' : ''
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-3xl bg-card p-4 text-left transition-colors active:bg-accent/60"
    >
      <div className="min-w-0 flex-1">
        <span className="inline-block rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium">Exercise {index + 1}</span>
        <p className="mt-3 truncate text-base font-semibold">{exercise?.name ?? 'Unknown exercise'}</p>
        <div className="mt-2 flex items-center gap-4 text-sm text-foreground/85">
          <span className="flex items-center gap-1.5"><Clock size={16} className="text-foreground/70" /> {minutes} min</span>
          <span className="flex items-center gap-1.5"><Dumbbell size={16} className="text-foreground/70" /> {item.reps}{unit}×{item.sets}</span>
        </div>
      </div>
      {/* Media placeholder — exercise videos aren't bundled (keeps the app free and offline). */}
      <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-secondary to-black">
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,hsl(var(--primary)/0.35),transparent_60%)]" />
        <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black shadow-lg">
          <Play size={18} className="ml-0.5 fill-black" />
        </span>
      </div>
    </button>
  )
}
