import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import NumberStepper from '@/components/NumberStepper'
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

  function handleComplete() {
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
            <span className="text-[10px] text-muted-foreground text-center">min</span>
            <NumberStepper
              value={set.duration}
              onChange={v => onChange('duration', v)}
              onBlur={handleComplete}
              step={1}
              min={0}
              inputMode="decimal"
            />
          </div>
          <div className="flex flex-col gap-0.5 flex-1">
            <span className="text-[10px] text-muted-foreground text-center">km</span>
            <NumberStepper
              value={set.distanceKm}
              onChange={v => onChange('distanceKm', v)}
              onBlur={handleComplete}
              step={0.5}
              min={0}
              inputMode="decimal"
            />
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-0.5 flex-1">
            <span className="text-[10px] text-muted-foreground text-center">reps</span>
            <NumberStepper
              value={set.reps}
              onChange={v => onChange('reps', v)}
              onBlur={handleComplete}
              step={1}
              min={0}
              inputMode="numeric"
            />
          </div>
          <div className="flex flex-col gap-0.5 flex-1">
            <span className="text-[10px] text-muted-foreground text-center">kg</span>
            <NumberStepper
              value={set.weight}
              onChange={v => onChange('weight', v)}
              onBlur={handleComplete}
              step={2.5}
              min={0}
              inputMode="decimal"
            />
          </div>
          <div className="flex flex-col gap-0.5 w-24">
            <span className="text-[10px] text-muted-foreground text-center">RPE</span>
            <NumberStepper
              value={set.rpe}
              onChange={v => onChange('rpe', v)}
              step={1}
              min={1}
              max={10}
              placeholder="—"
              inputMode="numeric"
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
