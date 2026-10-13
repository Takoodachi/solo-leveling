import { format, parseISO } from 'date-fns'
import FullScreen from '@/components/FullScreen'
import PageHeader from '@/components/PageHeader'
import { useEntryState } from '@/hooks/useEntryState'
import { useNow } from '@/hooks/useNow'
import { toDateStr } from '@/lib/date'
import { formatKcal } from '@/lib/format'
import { useFirstFoodDay, useFoodDays } from '@/features/nutrition/hooks/useFoodDays'
import FoodDayRow from '@/features/nutrition/components/FoodDayRow'
import HistoryCalendar from '@/features/workouts/components/HistoryCalendar'

/** What the screen is narrowed to. No month = the current one. */
interface View {
  month?: string // yyyy-MM
  day: string | null // yyyy-MM-dd
}

/**
 * The days food was logged on, a month at a time: the calendar picks the month, or one day of
 * it, and a day opens to what was eaten on it. The view is kept for the visit (`useEntryState`),
 * so coming back from a day opened in Nutrition lands where you left.
 */
export default function NutritionHistoryPage() {
  const today = toDateStr(useNow())
  const [view, setView] = useEntryState<View>('nutrition-history', { day: null })
  const { day } = view
  const month = view.month ?? today.slice(0, 7)
  const days = useFoodDays(month)
  const first = useFirstFoodDay()

  if (!days || first === undefined) return <FullScreen>{null}</FullScreen>

  const monthName = format(parseISO(`${month}-01`), 'MMMM')
  const summary = days.length === 0
    ? `No food logged in ${monthName}`
    : `${days.length} ${days.length === 1 ? 'day' : 'days'} logged · ${formatKcal(days.reduce((sum, d) => sum + d.kcal, 0) / days.length)} kcal a day on average`

  return (
    <FullScreen className="flex flex-col gap-3">
      <PageHeader back="/nutrition" title="History" />

      {first === null ? (
        <p className="rounded-3xl bg-card p-6 text-center text-sm text-muted-foreground">No food logged yet.</p>
      ) : (
        <>
          <HistoryCalendar
            month={month}
            trained={new Map(days.map(d => [d.date, 1]))}
            selected={day}
            today={today}
            firstMonth={first.slice(0, 7)}
            summary={summary}
            label={() => 'food logged'}
            onMonth={m => setView({ month: m, day: null })}
            onSelect={d => setView({ ...view, day: d })}
          />

          {day && (
            <div className="flex items-center justify-between px-1 pt-1">
              <h2 className="text-sm font-semibold">{format(parseISO(day), 'EEEE d MMMM')}</h2>
              <button type="button" onClick={() => setView({ ...view, day: null })} className="-my-2 h-10 px-1 text-xs font-semibold text-primary">
                Whole month
              </button>
            </div>
          )}

          {(day ? days.filter(d => d.date === day) : days).map(d => (
            <FoodDayRow key={d.date} day={d} open={d.date === day} onToggle={() => setView({ ...view, day: d.date === day ? null : d.date })} />
          ))}
        </>
      )}
    </FullScreen>
  )
}
