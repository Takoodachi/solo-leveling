import { addMonths, eachDayOfInterval, endOfMonth, format, getISODay, parseISO, startOfMonth } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toDateStr } from '@/lib/date'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const navBtn = 'flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-accent disabled:opacity-30'

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
  onMonth: (month: string) => void
  onSelect: (day: string | null) => void
}

/**
 * A month at a glance, Monday first: the days with a workout are filled in, and tapping one
 * narrows the list to it. Days without one are just days (nothing marks a miss).
 */
export default function HistoryCalendar({ month, trained, selected, today, firstMonth, summary, onMonth, onSelect }: Props) {
  const first = startOfMonth(parseISO(`${month}-01`))
  const days = eachDayOfInterval({ start: first, end: endOfMonth(first) })
  const step = (delta: number) => onMonth(format(addMonths(first, delta), 'yyyy-MM'))

  return (
    <section className="rounded-3xl bg-card p-3">
      <div className="flex items-center justify-between">
        <button type="button" className={navBtn} onClick={() => step(-1)} disabled={month <= firstMonth} aria-label="Previous month">
          <ChevronLeft size={20} />
        </button>
        <h2 className="font-semibold" aria-live="polite">{format(first, 'MMMM yyyy')}</h2>
        <button type="button" className={navBtn} onClick={() => step(1)} disabled={month >= today.slice(0, 7)} aria-label="Next month">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="mt-1 grid grid-cols-7 justify-items-center gap-y-1">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="pb-1 text-[11px] font-semibold text-muted-foreground">{d}</span>
        ))}
        {days.map((date, i) => {
          const day = toDateStr(date)
          const count = trained.get(day) ?? 0
          const isSelected = day === selected
          return (
            <button
              key={day}
              type="button"
              disabled={count === 0}
              onClick={() => onSelect(isSelected ? null : day)}
              aria-pressed={count > 0 ? isSelected : undefined}
              aria-label={`${format(date, 'EEEE d MMMM')}${count ? `, ${count} ${count === 1 ? 'workout' : 'workouts'}` : ''}`}
              // The 1st sits under its weekday; the rest follow
              style={i === 0 ? { gridColumnStart: getISODay(date) } : undefined}
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
        })}
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">{summary}</p>
    </section>
  )
}
