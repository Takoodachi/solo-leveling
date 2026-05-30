import { useMemo, useState } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface AiParsedFood {
  name: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  ingredients?: string[]
  notes?: string
}

interface Props {
  parsed: AiParsedFood
  onBack: () => void
  onConfirm: (food: {
    name: string
    kcal: number
    protein: number
    carbs: number
    fat: number
    notes: string
  }) => Promise<void> | void
}

function joinIngredientsAndNotes(parsed: AiParsedFood): string {
  const ing = (parsed.ingredients ?? []).filter(s => s && s.trim().length > 0)
  const ingLine = ing.length > 0 ? `Ingredients: ${ing.join(', ')}` : ''
  const noteLine = (parsed.notes ?? '').trim()
  return [ingLine, noteLine].filter(Boolean).join('\n')
}

export default function AiFoodConfirm({ parsed, onBack, onConfirm }: Props) {
  const initialNotes = useMemo(() => joinIngredientsAndNotes(parsed), [parsed])

  const [name, setName] = useState(parsed.name)
  const [kcal, setKcal] = useState(String(Math.round(parsed.kcal)))
  const [protein, setProtein] = useState(String(round1(parsed.protein)))
  const [carbs, setCarbs] = useState(String(round1(parsed.carbs)))
  const [fat, setFat] = useState(String(round1(parsed.fat)))
  const [notes, setNotes] = useState(initialNotes)
  const [saving, setSaving] = useState(false)

  const kcalN = Number(kcal)
  const proteinN = Number(protein)
  const carbsN = Number(carbs)
  const fatN = Number(fat)

  const canConfirm =
    name.trim().length > 0 &&
    Number.isFinite(kcalN) && kcalN >= 0 &&
    Number.isFinite(proteinN) && proteinN >= 0 &&
    Number.isFinite(carbsN) && carbsN >= 0 &&
    Number.isFinite(fatN) && fatN >= 0

  async function handleConfirm() {
    if (!canConfirm) return
    setSaving(true)
    try {
      await onConfirm({
        name: name.trim(),
        kcal: Math.round(kcalN),
        protein: round1(proteinN),
        carbs: round1(carbsN),
        fat: round1(fatN),
        notes: notes.trim(),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-4 pb-4 flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Estimated by AI — review and edit before logging.
      </p>

      <div className="flex flex-col gap-1">
        <Label>Name</Label>
        <Input value={name} onChange={e => setName(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label>Calories</Label>
          <Input type="number" inputMode="decimal" value={kcal} onChange={e => setKcal(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Protein (g)</Label>
          <Input type="number" inputMode="decimal" value={protein} onChange={e => setProtein(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Carbs (g)</Label>
          <Input type="number" inputMode="decimal" value={carbs} onChange={e => setCarbs(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Fat (g)</Label>
          <Input type="number" inputMode="decimal" value={fat} onChange={e => setFat(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label>Notes / Origin</Label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="Ingredients, preparation, cultural context…"
        />
      </div>

      <div className="flex gap-2 mt-1">
        <Button type="button" variant="outline" className="flex-1 gap-1.5" onClick={onBack} disabled={saving}>
          <ArrowLeft size={14} /> Back
        </Button>
        <Button type="button" className="flex-1 gap-1.5" onClick={handleConfirm} disabled={!canConfirm || saving}>
          <Check size={14} /> Confirm & Log
        </Button>
      </div>
    </div>
  )
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
