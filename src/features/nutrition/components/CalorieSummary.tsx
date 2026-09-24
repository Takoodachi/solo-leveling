import { useState } from 'react'
import { Info } from 'lucide-react'
import { formatKcal } from '@/lib/format'
import type { DailyNutrition } from '@/types'
import type { CalorieBudget } from '@/features/dashboard/hooks/useCalorieBudget'
import StepCaloriesSheet from '@/features/dashboard/components/StepCaloriesSheet'
import MacroBar from './MacroBar'

interface Props {
  totals: DailyNutrition
  budget: CalorieBudget
}

/** Net calories (eaten − steps) against the target, with the macro bars. */
export default function CalorieSummary({ totals, budget }: Props) {
  const [open, setOpen] = useState(false)
  const { targets, burn } = budget
  const net = totals.kcal - (burn?.kcal ?? 0)
  const pct = targets.kcal > 0 ? Math.max(0, Math.min(1, net / targets.kcal)) : 0

  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-card p-5">
      <div>
        <div className="flex items-baseline justify-between">
          <span className="font-heading text-3xl font-bold tabular-nums">{formatKcal(net)}</span>
          <span className="text-sm text-muted-foreground">/ {formatKcal(targets.kcal)} kcal</span>
        </div>
        {burn && (
          <button type="button" onClick={() => setOpen(true)} className="-mb-2 flex min-h-11 items-center gap-1.5 text-left text-xs text-muted-foreground tabular-nums hover:text-foreground">
            {formatKcal(totals.kcal)} eaten − {formatKcal(burn.kcal)} from {burn.steps.toLocaleString()} steps
            <Info size={14} className="shrink-0" />
          </button>
        )}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${pct * 100}%` }} />
      </div>
      <MacroBar label="Protein" value={totals.protein} target={targets.protein} colorClass="text-primary" />
      <MacroBar label="Carbs" value={totals.carbs} target={targets.carbs} colorClass="text-sky-400" />
      <MacroBar label="Fat" value={totals.fat} target={targets.fat} colorClass="text-amber-300" />
      {burn && <StepCaloriesSheet open={open} onClose={() => setOpen(false)} eaten={totals.kcal} burn={burn} target={targets.kcal} />}
    </div>
  )
}
