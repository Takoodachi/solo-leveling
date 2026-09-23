import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Exercise, Routine, RoutineExercise } from '@/types'
import { cn } from '@/lib/utils'
import { CATEGORIES, CATEGORY_META, LEVELS, LEVEL_META, WEEKDAY_SHORT, WEEK_ORDER } from '../categories'
import { useExerciseMap } from '../hooks/useExercises'
import ExercisePickerSheet from './ExercisePickerSheet'
import RoutineExerciseEditor from './RoutineExerciseEditor'

/** Defaults for a newly added exercise: cardio is one 20-minute entry, timed holds 3 × 1 min, lifts 3 × 10. */
function newRoutineExercise(ex: Exercise): RoutineExercise {
  if (ex.type === 'cardio') return { exerciseId: ex.uuid, sets: 1, reps: 20, restSec: 0 }
  return { exerciseId: ex.uuid, sets: 3, reps: ex.defaultUnit === 'min' ? 1 : 10, restSec: 90 }
}

export type RoutineDraft = Omit<Routine, 'updatedAt' | 'syncPending'>

interface Props {
  initial: RoutineDraft
  onSave: (routine: RoutineDraft) => Promise<void>
  onDelete?: () => Promise<void>
}

const chip = (active: boolean) =>
  cn('h-10 rounded-full px-4 text-sm font-medium transition-colors', active ? 'bg-foreground text-background' : 'bg-card text-foreground/80')

export default function RoutineForm({ initial, onSave, onDelete }: Props) {
  const [r, setR] = useState<RoutineDraft>(initial)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const exerciseMap = useExerciseMap()

  const patch = (p: Partial<RoutineDraft>) => setR(prev => ({ ...prev, ...p }))
  const setItem = (i: number, next: RoutineExercise) => patch({ exercises: r.exercises.map((x, j) => (j === i ? next : x)) })
  const move = (i: number, d: -1 | 1) => {
    const list = [...r.exercises]
    ;[list[i], list[i + d]] = [list[i + d], list[i]]
    patch({ exercises: list })
  }
  const toggleDay = (d: number) =>
    patch({ scheduleDays: r.scheduleDays.includes(d) ? r.scheduleDays.filter(x => x !== d) : [...r.scheduleDays, d].sort((a, b) => a - b) })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({ ...r, name: r.name.trim() || 'Untitled routine', estDurationMin: undefined })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="rt-name">Name</Label>
        <Input id="rt-name" value={r.name} onChange={e => patch({ name: e.target.value })} placeholder="e.g. Push Day" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="rt-notes">Description</Label>
        <Input id="rt-notes" value={r.notes ?? ''} onChange={e => patch({ notes: e.target.value })} placeholder="Optional" />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Type</Label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(c => <button key={c} type="button" className={chip(r.category === c)} onClick={() => patch({ category: c })}>{CATEGORY_META[c].label}</button>)}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Level</Label>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map(l => <button key={l} type="button" className={chip(r.level === l)} onClick={() => patch({ level: l })}>{LEVEL_META[l].label}</button>)}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Scheduled days</Label>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEK_ORDER.map(d => (
            <button
              key={d}
              type="button"
              onClick={() => toggleDay(d)}
              aria-pressed={r.scheduleDays.includes(d)}
              className={cn('h-11 rounded-2xl text-sm font-semibold', r.scheduleDays.includes(d) ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground/80')}
            >
              {WEEKDAY_SHORT[d][0]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Label>Exercises</Label>
        {r.exercises.map((item, i) => (
          <RoutineExerciseEditor
            key={`${item.exerciseId}-${i}`}
            item={item}
            exercise={exerciseMap.get(item.exerciseId)}
            isFirst={i === 0}
            isLast={i === r.exercises.length - 1}
            onChange={next => setItem(i, next)}
            onMove={d => move(i, d)}
            onRemove={() => patch({ exercises: r.exercises.filter((_, j) => j !== i) })}
          />
        ))}
        <Button type="button" variant="secondary" className="gap-2" onClick={() => setPickerOpen(true)}>
          <Plus size={16} /> Add exercise
        </Button>
      </div>

      <div className="flex flex-col gap-2 pt-2">
        <Button type="submit" size="lg" disabled={saving || r.exercises.length === 0}>{saving ? 'Saving…' : 'Save routine'}</Button>
        {onDelete && (
          <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => void onDelete()}>
            Delete routine
          </Button>
        )}
      </div>

      <ExercisePickerSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={ex => patch({ exercises: [...r.exercises, newRoutineExercise(ex)] })}
      />
    </form>
  )
}
