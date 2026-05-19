import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNutritionStore } from '@/features/nutrition/store'
import { useDailyLog } from '@/features/nutrition/hooks/useDailyLog'
import { useTargets } from '@/features/nutrition/hooks/useTargets'
import MacroBar from '@/features/nutrition/components/MacroBar'
import FavoriteFoods from '@/features/nutrition/components/FavoriteFoods'
import MealSection from '@/features/nutrition/components/MealSection'
import { formatDisplayDate } from '@/lib/date'
import { formatKcal } from '@/lib/format'
import { addDays, subDays } from 'date-fns'
import { parseISO, format } from 'date-fns'
import type { MealType } from '@/types'

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

export default function NutritionPage() {
  const { selectedDate, setDate } = useNutritionStore()
  const { totals, byMeal } = useDailyLog(selectedDate)
  const { targets } = useTargets()

  function navigate(direction: 1 | -1) {
    const current = parseISO(selectedDate)
    const next = direction === 1 ? addDays(current, 1) : subDays(current, 1)
    setDate(format(next, 'yyyy-MM-dd'))
  }

  const kcalTarget = targets?.dailyKcal ?? 2000
  const proteinTarget = targets?.dailyProtein ?? 150
  const carbsTarget = targets?.dailyCarbs ?? 200
  const fatTarget = targets?.dailyFat ?? 65

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Date navigator */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ChevronLeft size={18} />
        </Button>
        <h1 className="text-base font-semibold">{formatDisplayDate(selectedDate)}</h1>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
          <ChevronRight size={18} />
        </Button>
      </div>

      {/* Calorie summary */}
      <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
        <div className="flex justify-between items-baseline">
          <span className="text-2xl font-bold">{formatKcal(totals.kcal)}</span>
          <span className="text-sm text-muted-foreground">/ {formatKcal(kcalTarget)} kcal</span>
        </div>
        <MacroBar label="Protein" value={totals.protein} target={proteinTarget} colorClass="text-blue-400" />
        <MacroBar label="Carbs"   value={totals.carbs}   target={carbsTarget}   colorClass="text-orange-400" />
        <MacroBar label="Fat"     value={totals.fat}     target={fatTarget}     colorClass="text-yellow-400" />
      </div>

      {/* Favorites quick-add */}
      <FavoriteFoods date={selectedDate} mealType="snack" />

      {/* Meal sections */}
      {MEAL_ORDER.map(meal => (
        <MealSection
          key={meal}
          mealType={meal}
          entries={byMeal[meal] ?? []}
          date={selectedDate}
        />
      ))}
    </div>
  )
}
