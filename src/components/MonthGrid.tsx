import { useState, type ReactNode } from 'react'
import { addMonths, eachDayOfInterval, endOfMonth, format, getISODay, parseISO, startOfMonth } from 'date-fns'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toDateStr } from '@/lib/date'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const MONTHS = Array.from({ length: 12 }, (_, i) => format(new Date(2000, i, 1), 'MMM'))
const navBtn = 'flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-accent disabled:opacity-30'

interface Props {
  /** The month on show, "yyyy-MM". */
  month: string
  onMonth: (month: string) => void
  /** The first and last month that can be reached ("yyyy-MM"); open-ended when left out. */
  min?: string
  max?: string
  /** One day's button; the grid puts it under its weekday. */
  day: (day: string, date: Date) => ReactNode
}

/**
 * One month, Monday first, with arrows to the months beside it. Tapping the month's name swaps
 * the days for the twelve months of a year, so a date far off is a few taps away and not one
 * tap per month. Every calendar in the app is this grid with its own day buttons.
 */
export default function MonthGrid({ month, onMonth, min, max, day }: Props) {
  // The year whose months are on show in place of the days, while one is being picked
  const [year, setYear] = useState<number | null>(null)
  const first = startOfMonth(parseISO(`${month}-01`))
  const days = eachDayOfInterval({ start: first, end: endOfMonth(first) })
  const atStart = year == null ? !!min && month <= min : !!min && year <= Number(min.slice(0, 4))
  const atEnd = year == null ? !!max && month >= max : !!max && year >= Number(max.slice(0, 4))
  const step = (delta: number) => (year == null ? onMonth(format(addMonths(first, delta), 'yyyy-MM')) : setYear(year + delta))

  return (
    <div>
      <div className="flex items-center justify-between">
        <button type="button" className={navBtn} onClick={() => step(-1)} disabled={atStart} aria-label={year == null ? 'Previous month' : 'Previous year'}>
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          onClick={() => setYear(year == null ? first.getFullYear() : null)}
          aria-expanded={year != null}
          aria-label={year == null ? `${format(first, 'MMMM yyyy')}: pick another month` : `${year}: back to the days`}
          className="flex h-10 items-center gap-1 rounded-full px-3 font-semibold hover:bg-accent"
        >
          <span aria-live="polite">{year ?? format(first, 'MMMM yyyy')}</span>
          <ChevronDown size={16} className={cn('text-muted-foreground transition-transform duration-200', year != null && 'rotate-180')} />
        </button>
        <button type="button" className={navBtn} onClick={() => step(1)} disabled={atEnd} aria-label={year == null ? 'Next month' : 'Next year'}>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* As tall as six weeks whatever is on show, so nothing under it moves while paging */}
      <div className="mt-1 min-h-[18rem]">
        {year == null ? (
          <div className="grid grid-cols-7 justify-items-center gap-y-1">
            {WEEKDAYS.map((d, i) => (
              <span key={i} className="pb-1 text-[11px] font-semibold text-muted-foreground">{d}</span>
            ))}
            {days.map((date, i) => (
              // The 1st sits under its weekday; the rest follow
              <div key={date.getDate()} style={i === 0 ? { gridColumnStart: getISODay(date) } : undefined}>
                {day(toDateStr(date), date)}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid animate-fade-in grid-cols-3 gap-2 pt-2">
            {MONTHS.map((name, i) => {
              const m = `${year}-${String(i + 1).padStart(2, '0')}`
              return (
                <button
                  key={m}
                  type="button"
                  disabled={(!!min && m < min) || (!!max && m > max)}
                  onClick={() => { onMonth(m); setYear(null) }}
                  aria-pressed={m === month}
                  className={cn('h-12 rounded-full text-sm font-semibold disabled:opacity-30', m === month ? 'bg-primary text-primary-foreground' : 'bg-secondary')}
                >
                  {name}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
