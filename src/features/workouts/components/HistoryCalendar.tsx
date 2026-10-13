import { format } from 'date-fns'
import MonthGrid from '@/components/MonthGrid'
import { cn } from '@/lib/utils'

interface Props {
  /** The month on show, "yyyy-MM". */
  month: string
  /** Workouts per day ("yyyy-MM-dd"), for the days that had any. */
  trained: Map<string, number>
  /** The day the list is narrowed to, if any. */
  selected: string | null
  today: string
  /** The earliest month worth paging back to ("yyyy-MM"). */
  firstMonth: string
  /** One line under the grid: what the month added up to. */
  summary: string
  /** What a filled-in day stands for, read out after its date ("2 workouts" unless given). */
  label?: (count: number) => string
  onMonth: (month: string) => void
  onSelect: (day: string | null) => void
}

const workouts = (count: number) => `${count} ${count === 1 ? 'workout' : 'workouts'}`

/**
 * A month at a glance, Monday first: the days with a workout are filled in, and tapping one
 * narrows the list to it. Days without one are just days (nothing marks a miss). The food
 * history is the same calendar, with the days food was logged on.
 */
export default function HistoryCalendar({ month, trained, selected, today, firstMonth, summary, label = workouts, onMonth, onSelect }: Props) {
  return (
    <section className="rounded-3xl bg-card p-3">
      <MonthGrid
        month={month}
        onMonth={onMonth}
        min={firstMonth}
        max={today.slice(0, 7)}
        day={(day, date) => {
          const count = trained.get(day) ?? 0
          const isSelected = day === selected
          return (
            <button
              type="button"
              disabled={count === 0}
              onClick={() => onSelect(isSelected ? null : day)}
              aria-pressed={count > 0 ? isSelected : undefined}
              aria-label={`${format(date, 'EEEE d MMMM')}${count ? `, ${label(count)}` : ''}`}
              className={cn(
                'relative flex h-10 w-10 items-center justify-center rounded-full text-sm tabular-nums transition-colors',
                count > 0 ? 'bg-foreground font-bold text-background' : 'text-muted-foreground',
                day === today && count === 0 && 'font-bold text-foreground ring-1 ring-foreground/30',
                isSelected && 'bg-primary text-primary-foreground',
              )}
            >
              {format(date, 'd')}
              {count > 1 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground ring-2 ring-card">
                  {count}
                </span>
              )}
            </button>
          )
        }}
      />
      <p className="mt-3 text-center text-xs text-muted-foreground">{summary}</p>
    </section>
  )
}
