import { useState } from 'react'
import { Plus, ChevronDown, ChevronUp, History, Bookmark } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import FoodLogRow from './FoodLogRow'
import AddFoodDialog from './AddFoodDialog'
import MealOptionRow from './MealOptionRow'
import MealsSheet from './MealsSheet'
import { useFoods } from '../hooks/useFoods'
import { useRecentMeals, pastDayLabel } from '../hooks/useMeals'
import { logMealItems, toastLogged, itemCount, MEAL_LABELS } from '../logFoods'
import { formatKcal } from '@/lib/format'
import type { FoodLogWithFood, MealType } from '@/types'

interface Props {
  mealType: MealType
  entries: FoodLogWithFood[]
  date: string
}

export default function MealSection({ mealType, entries, date }: Props) {
  const [open, setOpen] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showMeals, setShowMeals] = useState(false)
  const { removeFoodLog } = useFoods()
  const recent = useRecentMeals(mealType, date) ?? []
  const last = recent[0]

  const mealKcal = entries.reduce((sum, e) => sum + e.food.kcalPerServing * e.servings, 0)

  async function repeatLast() {
    if (!last) return
    const uuids = await logMealItems(last.items, date, mealType)
    toastLogged(`Added ${itemCount(uuids.length)} to ${MEAL_LABELS[mealType].toLowerCase()}`, uuids)
  }

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

          {/* Nothing logged here yet: offer the last time's meal in one tap */}
          {entries.length === 0 && last && (
            <MealOptionRow
              icon={<History size={16} className="shrink-0 text-primary" />}
              title={`Same as ${pastDayLabel(last.date, date)}`}
              subtitle={`${formatKcal(last.kcal)} cal · ${last.names}`}
              onAdd={() => void repeatLast()}
            />
          )}

          <div className="mt-2 flex gap-2">
            <Button variant="secondary" size="sm" className="flex-1 gap-1.5" onClick={() => setShowAdd(true)}>
              <Plus size={14} />
              Add food
            </Button>
            <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setShowMeals(true)}>
              <Bookmark size={14} />
              Meals
            </Button>
          </div>
        </div>
      )}

      <AddFoodDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        date={date}
        mealType={mealType}
      />
      <MealsSheet open={showMeals} onOpenChange={setShowMeals} mealType={mealType} date={date} entries={entries} recent={recent} />
    </div>
  )
}
