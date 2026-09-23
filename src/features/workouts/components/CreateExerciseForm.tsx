import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EXERCISE_CATEGORIES } from '@/data/exercises'
import type { Exercise } from '@/types'
import { cn } from '@/lib/utils'
import { createCustomExercise } from '../hooks/useExercises'

const TRACKING = [
  { key: 'load',       label: 'Weight × reps', type: 'strength',   unit: 'kg' },
  { key: 'bodyweight', label: 'Reps',          type: 'bodyweight', unit: 'reps' },
  { key: 'hold',       label: 'Timed sets',    type: 'bodyweight', unit: 'min' },
  { key: 'cardio',     label: 'Cardio',        type: 'cardio',     unit: 'min' },
] as const

interface Props {
  initialName?: string
  onCreated: (exercise: Exercise) => void
  onCancel: () => void
}

export default function CreateExerciseForm({ initialName = '', onCreated, onCancel }: Props) {
  const [name, setName] = useState(initialName)
  const [category, setCategory] = useState<string>(EXERCISE_CATEGORIES[0])
  const [tracking, setTracking] = useState<(typeof TRACKING)[number]['key']>('load')
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const t = TRACKING.find(x => x.key === tracking)!
    const exercise = await createCustomExercise({ name: name.trim(), category, type: t.type, defaultUnit: t.unit })
    setSaving(false)
    onCreated(exercise)
  }

  const chip = (active: boolean) =>
    cn('h-9 rounded-full px-3.5 text-sm font-medium transition-colors', active ? 'bg-foreground text-background' : 'bg-secondary text-foreground/80')

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="ex-name">Name</Label>
        <Input id="ex-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Cable Y-Raise" autoFocus />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Muscle group</Label>
        <div className="flex flex-wrap gap-2">
          {EXERCISE_CATEGORIES.map(c => (
            <button key={c} type="button" className={chip(category === c)} onClick={() => setCategory(c)}>{c}</button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Tracked as</Label>
        <div className="flex flex-wrap gap-2">
          {TRACKING.map(t => (
            <button key={t.key} type="button" className={chip(tracking === t.key)} onClick={() => setTracking(t.key)}>{t.label}</button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="flex-1" disabled={!name.trim() || saving}>Create</Button>
      </div>
    </form>
  )
}
