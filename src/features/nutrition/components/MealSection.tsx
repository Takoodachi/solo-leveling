import { useState } from 'react'
import { Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import FoodLogRow from './FoodLogRow'
import AddFoodDialog from './AddFoodDialog'
import { useFoods } from '../hooks/useFoods'
import { formatKcal } from '@/lib/format'
import type { FoodLogWithFood, MealType } from '@/types'

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

interface Props {
  mealType: MealType
  entries: FoodLogWithFood[]
  date: string
}

export default function MealSection({ mealType, entries, date }: Props) {
  const [open, setOpen] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const { removeFoodLog } = useFoods()

  const mealKcal = entries.reduce((sum, e) => sum + e.food.kcalPerServing * e.servings, 0)

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{MEAL_LABELS[mealType]}</span>
          {entries.length > 0 && (
            <span className="text-xs text-muted-foreground">{formatKcal(mealKcal)} cal</span>
          )}
        </div>
        {open ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 pb-3">
          {entries.length > 0 && <Separator className="mb-2" />}

          {entries.map(entry => (
            <FoodLogRow
              key={entry.uuid}
              entry={entry}
              onDelete={() => void removeFoodLog(entry.uuid)}
            />
          ))}

          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-1 gap-1.5 text-muted-foreground"
            onClick={() => setShowAdd(true)}
          >
            <Plus size={14} />
            Add food
          </Button>
        </div>
      )}

      <AddFoodDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        date={date}
        mealType={mealType}
      />
    </div>
  )
}
