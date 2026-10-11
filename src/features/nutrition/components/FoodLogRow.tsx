import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatKcal } from '@/lib/format'
import type { FoodLogWithFood } from '@/types'
import { amountLabel } from '../logFoods'

interface Props {
  entry: FoodLogWithFood
  /** Tapping the food opens its amount to correct it. */
  onEdit: () => void
  onDelete: () => void
}

export default function FoodLogRow({ entry, onEdit, onDelete }: Props) {
  const kcal = Math.round(entry.food.kcalPerServing * entry.servings)
  const servingLabel = amountLabel(entry.food, entry.servings)

  return (
    <div className="flex items-center gap-2">
      {/* The row and the bin are sibling buttons (a button can't contain a button) */}
      <button
        type="button"
        onClick={onEdit}
        className="-mx-2 flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl px-2 py-2 text-left transition-colors active:bg-accent/60"
        aria-label={`${entry.food.name}, ${servingLabel}: change amount`}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{entry.food.name}</span>
          <span className="block text-xs text-muted-foreground">{servingLabel}</span>
        </span>
        <span className="shrink-0 text-sm font-medium">{formatKcal(kcal)} cal</span>
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
        aria-label="Remove food"
      >
        <Trash2 size={14} />
      </Button>
    </div>
  )
}
