import { useState } from 'react'
import { Info } from 'lucide-react'
import MacroBar from '@/features/nutrition/components/MacroBar'
import type { DailyNutrition } from '@/types'
import type { CalorieBudget } from '../hooks/useCalorieBudget'
import StepCaloriesSheet from './StepCaloriesSheet'

interface Props {
  totals: DailyNutrition
  budget: CalorieBudget
}

export default function MacrosCard({ totals, budget }: Props) {
  const [open, setOpen] = useState(false)
  const { targets, burn } = budget
  return (
    <div className="rounded-3xl bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-semibold">Macros</p>
        {burn && (
          <button type="button" onClick={() => setOpen(true)} className="-mr-2 flex items-center gap-1.5 rounded-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
            <span className="text-primary">+{burn.kcal} kcal from steps</span>
            <Info size={14} />
          </button>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <MacroBar label="Protein" value={totals.protein} target={targets.protein} colorClass="text-primary" />
        <MacroBar label="Carbs" value={totals.carbs} target={targets.carbs} colorClass="text-sky-400" />
        <MacroBar label="Fat" value={totals.fat} target={targets.fat} colorClass="text-amber-300" />
      </div>
      {burn && <StepCaloriesSheet open={open} onClose={() => setOpen(false)} eaten={totals.kcal} burn={burn} target={targets.kcal} />}
    </div>
  )
}
