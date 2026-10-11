import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { Search, X } from 'lucide-react'
import FullScreen from '@/components/FullScreen'
import PageHeader from '@/components/PageHeader'
import { Input } from '@/components/ui/input'
import { useEntryState } from '@/hooks/useEntryState'
import { useNow } from '@/hooks/useNow'
import { toDateStr } from '@/lib/date'
import { formatDurationMin } from '@/lib/format'
import { normalize } from '@/lib/search'
import { useWorkoutList, type WorkoutSummary } from '@/features/workouts/hooks/useWorkoutHistory'
import HistoryCalendar from '@/features/workouts/components/HistoryCalendar'
import WorkoutHistoryRow from '@/features/workouts/components/WorkoutHistoryRow'

const count = (n: number) => `${n} ${n === 1 ? 'workout' : 'workouts'}`

/** What the screen is narrowed to. No month = the current one. */
interface View {
  month?: string // yyyy-MM
  day: string | null // yyyy-MM-dd
  query: string
}

/** Every word has to be in the workout's name, one of its exercises or its notes. */
function matches(w: WorkoutSummary, words: string[]): boolean {
  const text = normalize([w.name ?? 'Workout', ...w.exerciseNames, w.notes].join(' '))
  return words.every(word => text.includes(word))
}

/**
 * Past workouts, a month at a time: the calendar picks the month (or one day of it), the search
 * looks through all of them. The view is kept for the visit (`useEntryState`), so coming back
 * from a workout lands where you left.
 */
export default function WorkoutHistoryPage() {
  const workouts = useWorkoutList()
  const today = toDateStr(useNow())
  const [view, setView] = useEntryState<View>('history', { day: null, query: '' })
  const { day, query } = view
  const month = view.month ?? today.slice(0, 7)
  const update = (next: Partial<View>) => setView({ ...view, ...next })

  const trained = useMemo(() => {
    const perDay = new Map<string, number>()
    for (const w of workouts ?? []) perDay.set(w.date, (perDay.get(w.date) ?? 0) + 1)
    return perDay
  }, [workouts])

  if (!workouts) return <FullScreen>{null}</FullScreen>

  const words = normalize(query).split(/\s+/).filter(Boolean)
  const searching = words.length > 0
  const inMonth = workouts.filter(w => w.date.startsWith(month))
  const shown = searching ? workouts.filter(w => matches(w, words)) : day ? inMonth.filter(w => w.date === day) : inMonth
  const firstMonth = workouts.reduce((min, w) => (w.date < min ? w.date : min), today).slice(0, 7)
  const monthName = format(parseISO(`${month}-01`), 'MMMM')
  const summary = inMonth.length === 0
    ? `No workouts in ${monthName}`
    : `${count(inMonth.length)} · ${formatDurationMin(inMonth.reduce((sum, w) => sum + w.durationMin, 0))}`

  return (
    <FullScreen className="flex flex-col gap-3">
      <PageHeader back="/workouts" title="History" />

      {workouts.length === 0 ? (
        <p className="rounded-3xl bg-card p-6 text-center text-sm text-muted-foreground">No workouts logged yet.</p>
      ) : (
        <>
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={e => update({ query: e.target.value })}
              placeholder="Search workouts or exercises"
              aria-label="Search workouts or exercises"
              enterKeyHint="search"
              className="bg-card px-11 [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => update({ query: '' })}
                className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground"
                aria-label="Clear search"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {!searching && (
            <HistoryCalendar
              month={month}
              trained={trained}
              selected={day}
              today={today}
              firstMonth={firstMonth}
              summary={summary}
              onMonth={m => update({ month: m, day: null })}
              onSelect={d => update({ day: d })}
            />
          )}

          {(searching || day) && (
            <div className="flex items-center justify-between px-1 pt-1">
              <h2 className="text-sm font-semibold">
                {searching ? `${count(shown.length)} with “${query.trim()}”` : format(parseISO(day!), 'EEEE d MMMM')}
              </h2>
              {!searching && (
                <button type="button" onClick={() => update({ day: null })} className="-my-2 h-10 px-1 text-xs font-semibold text-primary">
                  Whole month
                </button>
              )}
            </div>
          )}

          {shown.map(w => <WorkoutHistoryRow key={w.uuid} workout={w} showYear={searching && !w.date.startsWith(today.slice(0, 4))} />)}
          {searching && shown.length === 0 && (
            <p className="rounded-3xl bg-card p-6 text-center text-sm text-muted-foreground">Nothing matches. Try an exercise or a workout name.</p>
          )}
        </>
      )}
    </FullScreen>
  )
}
