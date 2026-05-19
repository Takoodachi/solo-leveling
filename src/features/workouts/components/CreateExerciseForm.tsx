import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useExercises } from '../hooks/useExercises'
import { EXERCISE_CATEGORIES } from '@/data/exercises'
import type { Exercise, ExerciseType } from '@/types'

interface Props {
  initialName?: string
  onCreated: (exercise: Exercise) => void
  onCancel: () => void
}

const TYPE_UNITS: Record<ExerciseType, Exercise['defaultUnit']> = {
  strength: 'kg',
  bodyweight: 'reps',
  cardio: 'min',
  flexibility: 'min',
}

const TYPES: { value: ExerciseType; label: string }[] = [
  { value: 'strength',   label: 'Strength' },
  { value: 'bodyweight', label: 'Bodyweight' },
  { value: 'cardio',     label: 'Cardio' },
]

export default function CreateExerciseForm({ initialName = '', onCreated, onCancel }: Props) {
  const { createCustomExercise } = useExercises()
  const [name, setName] = useState(initialName)
  const [type, setType] = useState<ExerciseType>('strength')
  const [category, setCategory] = useState<string>(EXERCISE_CATEGORIES[0])
  const [saving, setSaving] = useState(false)

  const defaultUnit = TYPE_UNITS[type]

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    const exercise = await createCustomExercise({ name: name.trim(), type, category, defaultUnit })
    setSaving(false)
    onCreated(exercise)
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-1.5">
        <Label>Name</Label>
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Cable Fly"
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Type</Label>
        <div className="flex gap-1 p-0.5 bg-muted rounded-md">
          {TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={cn(
                'flex-1 py-1.5 rounded text-xs font-medium transition-colors',
                type === t.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EXERCISE_CATEGORIES.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">
        Default unit: <span className="font-medium text-foreground">{defaultUnit}</span>
        {type === 'strength' ? ' — you can also log reps' : ''}
      </p>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button className="flex-1" onClick={handleSave} disabled={!name.trim() || saving}>
          Create
        </Button>
      </div>
    </div>
  )
}
