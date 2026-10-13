import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ChevronDown, ChevronRight } from 'lucide-react'
import Collapse from '@/components/Collapse'
import { formatKcal } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useDailyLog } from '../hooks/useDailyLog'
import type { FoodDay } from '../hooks/useFoodDays'
import { MEAL_OPTIONS, amountLabel } from '../logFoods'

interface Props {
  day: FoodDay
  open: boolean
  onToggle: () => void
}

/** What was eaten that day, meal by meal. Read-only: the day itself is changed in Nutrition. */
function Eaten({ date }: { date: string }) {
  const { byMeal, totals } = useDailyLog(date)
  return (
    <div className="flex flex-col gap-4 px-4 pb-4 pt-1">
      <p className="text-xs text-muted-foreground tabular-nums">
        Protein {Math.round(totals.protein)} g · Carbs {Math.round(totals.carbs)} g · Fat {Math.round(totals.fat)} g
      </p>
      {MEAL_OPTIONS.filter(meal => byMeal[meal.value].length > 0).map(meal => (
        <div key={meal.value}>
          <p className="eyebrow mb-1 text-muted-foreground">{meal.label}</p>
          {byMeal[meal.value].map(entry => (
            <div key={entry.uuid} className="flex items-center justify-between gap-3 py-1.5">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{entry.food.name}</span>
                <span className="block text-xs text-muted-foreground">{amountLabel(entry.food, entry.servings)}</span>
              </span>
              <span className="shrink-0 text-sm tabular-nums">{formatKcal(entry.food.kcalPerServing * entry.servings)} kcal</span>
            </div>
          ))}
        </div>
      ))}
      <Link to={`/nutrition?date=${date}`} className="flex h-11 items-center justify-center gap-1 rounded-full bg-secondary text-sm font-semibold">
        Open this day <ChevronRight size={16} className="text-muted-foreground" />
      </Link>
    </div>
  )
}

/** One day of the food history: what it added up to, and, opened, everything eaten on it. */
export default function FoodDayRow({ day, open, onToggle }: Props) {
  const date = parseISO(day.date)
  return (
    <div className="rounded-2xl bg-card">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-4 rounded-2xl p-3 pr-4 text-left transition-colors hover:bg-accent/60"
      >
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-secondary">
          <span className="text-lg font-bold leading-none">{format(date, 'd')}</span>
          <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{format(date, 'MMM')}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline justify-between gap-3 font-semibold">
            <span className="truncate">{format(date, 'EEEE')}</span>
            <span className="shrink-0 tabular-nums">{formatKcal(day.kcal)} kcal</span>
          </p>
          <p className="truncate text-xs text-muted-foreground">{day.names.join(', ')}</p>
        </div>
        <ChevronDown size={18} className={cn('shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </button>
      <Collapse open={open}>
        <Eaten date={day.date} />
      </Collapse>
    </div>
  )
}
