import { useState } from 'react'
import { Info } from 'lucide-react'
import MacroBar from '@/features/nutrition/components/MacroBar'
import type { DailyNutrition } from '@/types'
import type { EffectiveTargets } from '../hooks/useEffectiveTargets'
import type { UseDynamicTargetsResult } from '../hooks/useDynamicTargets'
import TargetBreakdownSheet from './TargetBreakdownSheet'

interface Props {
  totals: DailyNutrition
  targets: EffectiveTargets
  dynamic: UseDynamicTargetsResult
}

export default function MacrosCard({ totals, targets, dynamic }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-3xl bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-semibold">Macros</p>
        {dynamic.dynamic && dynamic.breakdown && (
          <button type="button" onClick={() => setOpen(true)} className="-mr-2 flex items-center gap-1.5 rounded-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
            {dynamic.breakdown.activityAvg > 0 && <span className="text-primary">+{dynamic.breakdown.activityAvg} kcal activity</span>}
            <Info size={14} />
          </button>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <MacroBar label="Protein" value={totals.protein} target={targets.protein} colorClass="text-primary" />
        <MacroBar label="Carbs" value={totals.carbs} target={targets.carbs} colorClass="text-sky-400" />
        <MacroBar label="Fat" value={totals.fat} target={targets.fat} colorClass="text-amber-300" />
      </div>
      {dynamic.dynamic && dynamic.targets && dynamic.breakdown && (
        <TargetBreakdownSheet open={open} onClose={() => setOpen(false)} targets={dynamic.targets} breakdown={dynamic.breakdown} />
      )}
    </div>
  )
}
