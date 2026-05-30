import { cn } from '@/lib/utils'
import type { TrainedExercise } from '../hooks/useAnalyticsData'

interface Props {
  exercises: TrainedExercise[]
  value: string | null
  onChange: (uuid: string) => void
}

export default function ExercisePicker({ exercises, value, onChange }: Props) {
  if (exercises.length === 0) return null

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted-foreground">Exercise</label>
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        className={cn(
          'w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        {exercises.map(({ exercise, totalSets }) => (
          <option key={exercise.uuid} value={exercise.uuid}>
            {exercise.name} ({totalSets} sets)
          </option>
        ))}
      </select>
    </div>
  )
}
