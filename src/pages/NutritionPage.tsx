import { useSearchParams } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, parseISO } from 'date-fns'
import PageHeader from '@/components/PageHeader'
import DatePicker from '@/components/DatePicker'
import { useEntryState } from '@/hooks/useEntryState'
import { useIsNavTab } from '@/hooks/useNavTabs'
import { useDailyLog } from '@/features/nutrition/hooks/useDailyLog'
import { useCalorieBudget } from '@/features/dashboard/hooks/useCalorieBudget'
import CalorieSummary from '@/features/nutrition/components/CalorieSummary'
import FavoriteFoods from '@/features/nutrition/components/FavoriteFoods'
import CopyDayCard from '@/features/nutrition/components/CopyDayCard'
import MealSection from '@/features/nutrition/components/MealSection'
import AddFoodDialog from '@/features/nutrition/components/AddFoodDialog'
import { formatDisplayDate, toDateStr } from '@/lib/date'
import { useNow } from '@/hooks/useNow'
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
  const now = useNow()
  const todayStr = toDateStr(now)
  // The day on show belongs to the visit: opened afresh (its tab, "Log food" from +) it is today,
  // and Back finds the day that was being looked at. Until one is picked it follows the clock:
  // kept app-wide, "Log food" went to whichever day was looked at last, days later too.
  const [picked, setPicked] = useEntryState<string | null>('nutrition-day', null)
  const selectedDate = picked ?? todayStr
  const setDate = (date: string) => setPicked(date === todayStr ? null : date)
  const { logs, totals, byMeal } = useDailyLog(selectedDate)
  const budget = useCalorieBudget(selectedDate)
  const [params, setParams] = useSearchParams()
  const quickAdd = params.get('add') === '1'
  const isTab = useIsNavTab('/nutrition')

  function shift(direction: 1 | -1) {
    setDate(toDateStr(addDays(parseISO(selectedDate), direction)))
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader back={isTab ? undefined : '/home'} title="Nutrition" />

      <div className="flex items-center justify-between rounded-full bg-card p-1">
        <button type="button" onClick={() => shift(-1)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent" aria-label="Previous day">
          <ChevronLeft size={20} />
        </button>
        <DatePicker
          value={selectedDate}
          onChange={setDate}
          aria-label={`${formatDisplayDate(selectedDate)}: pick another day`}
          className="flex h-10 items-center gap-2 rounded-full px-3 font-semibold hover:bg-accent"
        >
          <CalendarDays size={18} className="text-muted-foreground" />
          {formatDisplayDate(selectedDate)}
        </DatePicker>
        <button type="button" onClick={() => shift(1)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent" aria-label="Next day">
          <ChevronRight size={20} />
        </button>
      </div>

      <CalorieSummary totals={totals} budget={budget} />

      {logs.length === 0 && <CopyDayCard date={selectedDate} />}

      <FavoriteFoods date={selectedDate} mealType={mealForNow(now.getHours())} />

      {MEAL_ORDER.map(meal => (
        <MealSection key={meal} mealType={meal} entries={byMeal[meal] ?? []} date={selectedDate} />
      ))}

      <AddFoodDialog
        // Search on Home opens a food with ?q=<name>; a new query starts a fresh dialog.
        key={params.get('q') ?? ''}
        initialQuery={params.get('q') ?? ''}
        open={quickAdd}
        onClose={() => setParams({}, { replace: true })}
        date={selectedDate}
        mealType={mealForNow(now.getHours())}
      />
    </div>
  )
}
