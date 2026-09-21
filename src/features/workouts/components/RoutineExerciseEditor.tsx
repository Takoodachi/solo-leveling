import { ArrowUp, ArrowDown, X } from 'lucide-react'
import NumberStepper from '@/components/NumberStepper'
import type { Exercise, RoutineExercise } from '@/types'
import { setModeFor } from '@/lib/workoutMath'
import { cn } from '@/lib/utils'

const REST_OPTIONS = [0, 30, 45, 60, 90, 120, 180]

interface Props {
  item: RoutineExercise
  exercise?: Exercise
  isFirst: boolean
  isLast: boolean
  onChange: (next: RoutineExercise) => void
  onMove: (delta: -1 | 1) => void
  onRemove: () => void
}

export default function RoutineExerciseEditor({ item, exercise, isFirst, isLast, onChange, onMove, onRemove }: Props) {
  const timed = exercise ? setModeFor(exercise) === 'time' : false
  const iconBtn = 'flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent disabled:opacity-30'

  return (
    <div className="rounded-3xl bg-card p-4">
      <div className="mb-3 flex items-center gap-1">
        <p className="min-w-0 flex-1 truncate font-semibold">{exercise?.name ?? 'Unknown exercise'}</p>
        <button type="button" className={iconBtn} disabled={isFirst} onClick={() => onMove(-1)} aria-label="Move up"><ArrowUp size={16} /></button>
        <button type="button" className={iconBtn} disabled={isLast} onClick={() => onMove(1)} aria-label="Move down"><ArrowDown size={16} /></button>
        <button type="button" className={iconBtn} onClick={onRemove} aria-label="Remove"><X size={16} /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Sets</p>
          <NumberStepper value={String(item.sets)} onChange={v => onChange({ ...item, sets: Math.max(1, Math.round(Number(v) || 1)) })} min={1} max={20} inputMode="numeric" />
        </div>
        <div>
          <p className="mb-1 text-xs text-muted-foreground">{timed ? 'Minutes' : 'Reps'}</p>
          <NumberStepper value={String(item.reps)} onChange={v => onChange({ ...item, reps: Math.max(1, Math.round(Number(v) || 1)) })} min={1} max={200} inputMode="numeric" />
        </div>
      </div>
      <p className="mb-1.5 mt-3 text-xs text-muted-foreground">Rest between sets</p>
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
        {REST_OPTIONS.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => onChange({ ...item, restSec: s })}
            className={cn(
              'h-9 shrink-0 rounded-full px-3 text-sm font-medium',
              item.restSec === s ? 'bg-foreground text-background' : 'bg-secondary text-foreground/80',
            )}
          >
            {s === 0 ? 'None' : s < 60 ? `${s}s` : `${s / 60}${s % 60 ? '.5' : ''}m`}
          </button>
        ))}
      </div>
    </div>
  )
}
