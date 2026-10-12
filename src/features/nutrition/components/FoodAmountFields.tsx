import { Label } from '@/components/ui/label'
import NumberStepper from '@/components/NumberStepper'
import { cn } from '@/lib/utils'
import type { Food } from '@/types'
import { computeMacros, isQuickAdd, servingsOf, usesGrams, type AmountDraft } from '../foodAmount'

interface Props {
  food: Food
  draft: AmountDraft
  onChange: (draft: AmountDraft) => void
}

/** How much of a food: grams or servings, with what that comes to underneath. Used when adding and when correcting. */
export default function FoodAmountFields({ food, draft, onChange }: Props) {
  const macros = computeMacros(food, servingsOf(food, draft))

  return (
    <>
      <div className="flex flex-col gap-2">
        {usesGrams(food) && !isQuickAdd(food) && (
          <div className="flex gap-1 p-0.5 bg-muted rounded-md w-fit">
            {(['grams', 'servings'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => onChange({ ...draft, mode: m })}
                className={cn(
                  'px-3 py-1 rounded text-xs font-medium transition-colors',
                  draft.mode === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
                )}
              >
                {m === 'grams' ? `${food.servingUnit}` : 'Servings'}
              </button>
            ))}
          </div>
        )}

        <Label>{isQuickAdd(food) ? 'Calories' : draft.mode === 'grams' ? `Amount (${food.servingUnit})` : 'Servings'}</Label>

        {draft.mode === 'grams' ? (
          <NumberStepper
            value={draft.grams}
            onChange={grams => onChange({ ...draft, grams })}
            step={10}
            min={0}
            inputMode="decimal"
            placeholder={String(food.servingSize)}
          />
        ) : (
          <NumberStepper
            value={draft.servings}
            onChange={servings => onChange({ ...draft, servings })}
            step={0.5}
            min={0.1}
            inputMode="decimal"
            placeholder="1"
          />
        )}
      </div>

      <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 flex justify-between">
        <span><span className="text-foreground font-medium">{macros.kcal}</span> cal</span>
        <span>P <span className="text-foreground font-medium">{macros.protein}</span>g</span>
        <span>C <span className="text-foreground font-medium">{macros.carbs}</span>g</span>
        <span>F <span className="text-foreground font-medium">{macros.fat}</span>g</span>
      </div>
    </>
  )
}
