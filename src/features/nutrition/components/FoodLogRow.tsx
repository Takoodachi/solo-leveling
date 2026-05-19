import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatKcal } from '@/lib/format'
import type { FoodLogWithFood } from '@/types'

interface Props {
  entry: FoodLogWithFood
  onDelete: () => void
}

export default function FoodLogRow({ entry, onDelete }: Props) {
  const kcal = Math.round(entry.food.kcalPerServing * entry.servings)
  const servingLabel = entry.servings === 1
    ? `1 × ${entry.food.servingSize}${entry.food.servingUnit}`
    : `${entry.servings} × ${entry.food.servingSize}${entry.food.servingUnit}`

  return (
    <div className="flex items-center justify-between py-2 gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{entry.food.name}</p>
        <p className="text-xs text-muted-foreground">{servingLabel}</p>
      </div>
      <span className="text-sm font-medium shrink-0">{formatKcal(kcal)} kcal</span>
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
