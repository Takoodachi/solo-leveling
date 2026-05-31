import React from 'react'
import { Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import NumberStepper from '@/components/NumberStepper'
import { cn } from '@/lib/utils'
import type { SetDraft, LastSet } from '../types'
import type { ExerciseType } from '@/types'

interface Props {
  set: SetDraft
  index: number
  exerciseType: ExerciseType
  onChange: (field: keyof Omit<SetDraft, 'uuid'>, value: string) => void
  onDelete: () => void
  onSetComplete: () => void
  focusMode?: boolean
  lastSet?: LastSet
}

function describeLastSet(s: LastSet, isCardio: boolean): string | null {
  if (isCardio) {
    const parts: string[] = []
    if (s.duration != null) parts.push(`${s.duration} min`)
    if (s.distanceKm != null) parts.push(`${s.distanceKm} km`)
    return parts.length > 0 ? parts.join(' · ') : null
  }
  const parts: string[] = []
  if (s.weight != null) parts.push(`${s.weight} kg`)
  if (s.reps != null) parts.push(`× ${s.reps}`)
  return parts.length > 0 ? parts.join(' ') : null
}

export default function SetRow({
  set, index, exerciseType, onChange, onDelete, onSetComplete,
  focusMode = false, lastSet,
}: Props) {
  const isCardio = exerciseType === 'cardio'

  const [isCompleted, setIsCompleted] = React.useState(false)

  function handleComplete() {
    const hasValue = isCardio
      ? set.duration || set.distanceKm
      : set.reps || set.weight
    if (hasValue) {
      setIsCompleted(true)
      onSetComplete()
      setTimeout(() => setIsCompleted(false), 500)
    }
  }

  const stepperSize = focusMode ? 'lg' : 'sm'
  const labelClass = focusMode ? 'text-xs' : 'text-[10px]'
  const indexClass = focusMode ? 'text-sm font-semibold w-7' : 'text-xs w-6'
  const deleteSize = focusMode ? 'h-12 w-12' : 'h-9 w-9'
  const lastSetLabel = lastSet ? describeLastSet(lastSet, isCardio) : null

  return (
    <motion.div
      className={cn(
        'flex flex-col gap-0.5 py-1 px-1 rounded-md',
        focusMode && 'py-1.5'
      )}
      animate={{ backgroundColor: isCompleted ? 'hsl(var(--primary) / 0.2)' : 'transparent' }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-2">
        <span className={cn('text-muted-foreground text-center shrink-0', indexClass)}>{index + 1}</span>

        {isCardio ? (
          <>
            <div className="flex flex-col gap-0.5 flex-1">
              <span className={cn('text-muted-foreground text-center', labelClass)}>min</span>
              <NumberStepper
                value={set.duration}
                onChange={v => onChange('duration', v)}
                onBlur={handleComplete}
                step={1}
                min={0}
                inputMode="decimal"
                size={stepperSize}
              />
            </div>
            <div className="flex flex-col gap-0.5 flex-1">
              <span className={cn('text-muted-foreground text-center', labelClass)}>km</span>
              <NumberStepper
                value={set.distanceKm}
                onChange={v => onChange('distanceKm', v)}
                onBlur={handleComplete}
                step={0.5}
                min={0}
                inputMode="decimal"
                size={stepperSize}
              />
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-0.5 flex-1">
              <span className={cn('text-muted-foreground text-center', labelClass)}>reps</span>
              <NumberStepper
                value={set.reps}
                onChange={v => onChange('reps', v)}
                onBlur={handleComplete}
                step={1}
                min={0}
                inputMode="numeric"
                size={stepperSize}
              />
            </div>
            <div className="flex flex-col gap-0.5 flex-1">
              <span className={cn('text-muted-foreground text-center', labelClass)}>kg</span>
              <NumberStepper
                value={set.weight}
                onChange={v => onChange('weight', v)}
                onBlur={handleComplete}
                step={2.5}
                min={0}
                inputMode="decimal"
                size={stepperSize}
              />
            </div>
            <div className={cn('flex flex-col gap-0.5', focusMode ? 'w-20' : 'w-24')}>
              <span className={cn('text-muted-foreground text-center', labelClass)}>RPE</span>
              <NumberStepper
                value={set.rpe}
                onChange={v => onChange('rpe', v)}
                step={1}
                min={1}
                max={10}
                placeholder="—"
                inputMode="numeric"
                size={stepperSize}
              />
            </div>
          </>
        )}

        <Button
          variant="ghost"
          size="icon"
          className={cn('shrink-0 text-muted-foreground hover:text-destructive', deleteSize)}
          onClick={onDelete}
          aria-label="Remove set"
        >
          <Trash2 size={focusMode ? 16 : 14} />
        </Button>
      </div>

      {lastSetLabel && (
        <p className={cn(
          'text-muted-foreground/80 pl-9',
          focusMode ? 'text-xs' : 'text-[10px]'
        )}>
          Last: {lastSetLabel}
        </p>
      )}
    </motion.div>
  )
}
