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
    <div className="rounded-3xl bg-card">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-5 py-4 rounded-3xl active:bg-accent/40 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold">{MEAL_LABELS[mealType]}</span>
          {entries.length > 0 && (
            <span className="text-xs text-muted-foreground">{formatKcal(mealKcal)} cal</span>
          )}
        </div>
        {open ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-5 pb-4">
          {entries.length > 0 && <Separator className="mb-2" />}

          {entries.map(entry => (
            <FoodLogRow
              key={entry.uuid}
              entry={entry}
              onDelete={() => void removeFoodLog(entry.uuid)}
            />
          ))}

          <Button
            variant="secondary"
            size="sm"
            className="w-full mt-2 gap-1.5"
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
