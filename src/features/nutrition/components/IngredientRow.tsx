import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import NumberStepper from '@/components/NumberStepper'
import { macrosForIngredient } from '@/lib/macroCalc'
import type { Food, FoodIngredient } from '@/types'

interface Props {
  ingredient: FoodIngredient
  source: Food | undefined
  onChange: (grams: number) => void
  onDelete: () => void
}

export default function IngredientRow({ ingredient, source, onChange, onDelete }: Props) {
  const macros = macrosForIngredient(ingredient, source)

  return (
    <div className="flex items-center gap-2 py-1.5 px-1 rounded-md">
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{source?.name ?? 'Unknown food'}</p>
        <p className="text-[11px] text-muted-foreground">
          {Math.round(macros.kcal)} cal · P {macros.protein.toFixed(1)} · C {macros.carbs.toFixed(1)} · F {macros.fat.toFixed(1)}
        </p>
      </div>
      <div className="w-24 shrink-0">
        <NumberStepper
          value={String(ingredient.grams)}
          onChange={v => onChange(Number(v) || 0)}
          step={10}
          min={0}
          inputMode="decimal"
          placeholder="g"
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
        aria-label="Remove ingredient"
      >
        <Trash2 size={14} />
      </Button>
    </div>
  )
}
