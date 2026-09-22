import { useState } from 'react'
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Segmented from '@/components/Segmented'
import { cn } from '@/lib/utils'
import { nutritionWarnings, type NutrientKey, type ScannedFood } from '../openFoodFacts'

const FIELDS: { key: NutrientKey; label: string }[] = [
  { key: 'kcal', label: 'Calories' },
  { key: 'protein', label: 'Protein (g)' },
  { key: 'carbs', label: 'Carbs (g)' },
  { key: 'fat', label: 'Fat (g)' },
]

export interface ReviewedFood {
  barcode: string
  name: string
  amount: number
  unit: 'g' | 'ml'
  kcal: number
  protein: number
  carbs: number
  fat: number
}

interface Props {
  scan: ScannedFood
  onBack: () => void
  onRecheck?: () => void
  onSave: (food: ReviewedFood) => Promise<void>
}

const parse = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')))

/**
 * Review step for a barcode result. Open Food Facts is crowd-sourced, so
 * everything is editable and obvious problems are flagged before saving.
 */
export default function ScannedFoodReview({ scan, onBack, onRecheck, onSave }: Props) {
  const [name, setName] = useState(scan.name)
  const [amount, setAmount] = useState(String(scan.amount))
  const [unit, setUnit] = useState(scan.unit)
  const [values, setValues] = useState(() =>
    Object.fromEntries(FIELDS.map(f => [f.key, scan.values[f.key] == null ? '' : String(scan.values[f.key])])) as Record<NutrientKey, string>,
  )
  const [saving, setSaving] = useState(false)

  const amountN = parse(amount)
  const parsed = Object.fromEntries(FIELDS.map(f => [f.key, parse(values[f.key])])) as Record<NutrientKey, number | null>
  const allValid = FIELDS.every(f => parsed[f.key] != null && Number.isFinite(parsed[f.key]) && parsed[f.key]! >= 0)
  const canSave = name.trim() !== '' && amountN != null && amountN > 0 && allValid
  const warnings = nutritionWarnings(parsed, amountN ?? 0)

  async function save() {
    if (!canSave) return
    setSaving(true)
    try {
      await onSave({
        barcode: scan.barcode,
        name: name.trim(),
        amount: amountN!,
        unit,
        kcal: Math.round(parsed.kcal!),
        protein: Math.round(parsed.protein! * 10) / 10,
        carbs: Math.round(parsed.carbs! * 10) / 10,
        fat: Math.round(parsed.fat! * 10) / 10,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      <p className="text-xs text-muted-foreground">
        Barcode <span className="font-mono text-foreground">{scan.barcode}</span> ·{' '}
        {scan.source === 'saved' ? 'your saved entry' : 'Open Food Facts (crowd-sourced) — compare with the label'}
      </p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="scan-name">Name</Label>
        <Input id="scan-name" value={name} onChange={e => setName(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="scan-amount">Nutrition per</Label>
        <div className="flex gap-2">
          <Input id="scan-amount" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} className="w-28 text-center" />
          <Segmented size="sm" value={unit} onChange={setUnit} className="flex-1 bg-secondary" options={[{ value: 'g', label: 'grams' }, { value: 'ml', label: 'ml' }]} />
        </div>
        <p className="text-xs text-muted-foreground">
          {scan.servingLabel
            ? `Package serving: ${scan.servingLabel}`
            : scan.source === 'database' && scan.amount === 100 ? 'No package serving listed — values are per 100.' : null}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map(f => (
          <div key={f.key} className="flex flex-col gap-1.5">
            <Label htmlFor={`scan-${f.key}`}>{f.label}</Label>
            <Input
              id={`scan-${f.key}`}
              inputMode="decimal"
              placeholder="From label"
              value={values[f.key]}
              onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
              className={cn(values[f.key].trim() === '' && 'ring-2 ring-amber-400/70')}
            />
          </div>
        ))}
      </div>

      {warnings.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-2xl bg-amber-400/10 p-3 text-sm text-amber-200">
          {warnings.map(w => (
            <p key={w} className="flex gap-2"><AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-400" />{w}</p>
          ))}
        </div>
      )}

      {onRecheck && (
        <Button type="button" variant="ghost" size="sm" className="gap-2 self-start" onClick={onRecheck}>
          <RefreshCw size={14} /> Re-check Open Food Facts
        </Button>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="secondary" className="flex-1 gap-1.5" onClick={onBack} disabled={saving}>
          <ArrowLeft size={16} /> Back
        </Button>
        <Button type="button" className="flex-1" onClick={() => void save()} disabled={!canSave || saving}>
          {saving ? 'Saving…' : 'Save & continue'}
        </Button>
      </div>
    </div>
  )
}
