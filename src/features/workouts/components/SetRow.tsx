import { Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SetDraft } from '../types'
import type { ExerciseType } from '@/types'

interface Props {
  set: SetDraft
  index: number
  exerciseType: ExerciseType
  onChange: (field: keyof Omit<SetDraft, 'uuid'>, value: string) => void
  onDelete: () => void
  onSetComplete: () => void
}

export default function SetRow({ set, index, exerciseType, onChange, onDelete, onSetComplete }: Props) {
  const isCardio = exerciseType === 'cardio'

  function handleBlur() {
    // Trigger rest timer when a value is entered
    const hasValue = isCardio
      ? set.duration || set.distanceKm
      : set.reps || set.weight
    if (hasValue) onSetComplete()
  }

  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-xs text-muted-foreground w-6 text-center shrink-0">{index + 1}</span>

      {isCardio ? (
        <>
          <div className="flex flex-col gap-0.5 flex-1">
            <span className="text-[10px] text-muted-foreground">min</span>
            <Input
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={set.duration}
              onChange={e => onChange('duration', e.target.value)}
              onBlur={handleBlur}
              className="h-9 text-center px-2"
            />
          </div>
          <div className="flex flex-col gap-0.5 flex-1">
            <span className="text-[10px] text-muted-foreground">km</span>
            <Input
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={set.distanceKm}
              onChange={e => onChange('distanceKm', e.target.value)}
              onBlur={handleBlur}
              className="h-9 text-center px-2"
            />
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-0.5 flex-1">
            <span className="text-[10px] text-muted-foreground">reps</span>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={set.reps}
              onChange={e => onChange('reps', e.target.value)}
              onBlur={handleBlur}
              className="h-9 text-center px-2"
            />
          </div>
          <div className="flex flex-col gap-0.5 flex-1">
            <span className="text-[10px] text-muted-foreground">kg</span>
            <Input
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={set.weight}
              onChange={e => onChange('weight', e.target.value)}
              onBlur={handleBlur}
              className="h-9 text-center px-2"
            />
          </div>
          <div className="flex flex-col gap-0.5 w-14">
            <span className="text-[10px] text-muted-foreground">RPE</span>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="—"
              min="1"
              max="10"
              value={set.rpe}
              onChange={e => onChange('rpe', e.target.value)}
              className="h-9 text-center px-2"
            />
          </div>
        </>
      )}

      <Button
        variant="ghost"
        size="icon"
        className={cn('h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive')}
        onClick={onDelete}
        aria-label="Remove set"
      >
        <Trash2 size={14} />
      </Button>
    </div>
  )
}
