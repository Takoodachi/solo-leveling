import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, subDays, parseISO, format } from 'date-fns'
import PageHeader from '@/components/PageHeader'
import { useNutritionStore } from '@/features/nutrition/store'
import { useDailyLog } from '@/features/nutrition/hooks/useDailyLog'
import { useEffectiveTargets } from '@/features/dashboard/hooks/useEffectiveTargets'
import MacroBar from '@/features/nutrition/components/MacroBar'
import FavoriteFoods from '@/features/nutrition/components/FavoriteFoods'
import MealSection from '@/features/nutrition/components/MealSection'
import AddFoodDialog from '@/features/nutrition/components/AddFoodDialog'
import { formatDisplayDate } from '@/lib/date'
import { useNow } from '@/hooks/useNow'
import { formatKcal } from '@/lib/format'
import type { MealType } from '@/types'

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

/** Best-guess meal for a quick add from the + menu. */
function mealForNow(hour: number): MealType {
  if (hour < 10) return 'breakfast'
  if (hour < 15) return 'lunch'
  if (hour < 21) return 'dinner'
  return 'snack'
}

export default function NutritionPage() {
  const { selectedDate, setDate } = useNutritionStore()
  const { totals, byMeal } = useDailyLog(selectedDate)
  const { targets } = useEffectiveTargets(selectedDate)
  const [params, setParams] = useSearchParams()
  const quickAdd = params.get('add') === '1'
  const now = useNow()

  function shift(direction: 1 | -1) {
    const current = parseISO(selectedDate)
    setDate(format(direction === 1 ? addDays(current, 1) : subDays(current, 1), 'yyyy-MM-dd'))
  }

  const pct = targets.kcal > 0 ? Math.min(1, totals.kcal / targets.kcal) : 0

  return (
    <div className="flex flex-col gap-4">
      <PageHeader back="/home" title="Nutrition" />

      <div className="flex items-center justify-between rounded-full bg-card p-1">
        <button type="button" onClick={() => shift(-1)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent" aria-label="Previous day">
          <ChevronLeft size={20} />
        </button>
        <span className="font-semibold">{formatDisplayDate(selectedDate)}</span>
        <button type="button" onClick={() => shift(1)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent" aria-label="Next day">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="flex flex-col gap-4 rounded-3xl bg-card p-5">
        <div className="flex items-baseline justify-between">
          <span className="font-heading text-3xl font-bold tabular-nums">{formatKcal(totals.kcal)}</span>
          <span className="text-sm text-muted-foreground">/ {formatKcal(targets.kcal)} kcal</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${pct * 100}%` }} />
        </div>
        <MacroBar label="Protein" value={totals.protein} target={targets.protein} colorClass="text-primary" />
        <MacroBar label="Carbs" value={totals.carbs} target={targets.carbs} colorClass="text-sky-400" />
        <MacroBar label="Fat" value={totals.fat} target={targets.fat} colorClass="text-amber-300" />
      </div>

      <FavoriteFoods date={selectedDate} mealType="snack" />

      {MEAL_ORDER.map(meal => (
        <MealSection key={meal} mealType={meal} entries={byMeal[meal] ?? []} date={selectedDate} />
      ))}

      <AddFoodDialog
        open={quickAdd}
        onClose={() => setParams({}, { replace: true })}
        date={selectedDate}
        mealType={mealForNow(now.getHours())}
      />
    </div>
  )
}
