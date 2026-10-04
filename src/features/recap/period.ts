import { addDays, addMonths, addYears, eachDayOfInterval, endOfMonth, endOfYear, format, parseISO, startOfMonth, startOfYear } from 'date-fns'
import { toDateStr, weekDates } from '@/lib/date'

/** What a recap covers: a Mon–Sun week, a calendar month or a calendar year. */
export type RecapPeriod = 'week' | 'month' | 'year'

export const PERIODS: { value: RecapPeriod; label: string; title: string }[] = [
  { value: 'week', label: 'Week', title: 'Weekly recap' },
  { value: 'month', label: 'Month', title: 'Monthly recap' },
  { value: 'year', label: 'Year', title: 'Yearly recap' },
]

export function isRecapPeriod(v: string | null): v is RecapPeriod {
  return v === 'week' || v === 'month' || v === 'year'
}

/** First day of the period that contains `date`. */
export function periodStart(period: RecapPeriod, date: Date): string {
  if (period === 'week') return weekDates(date)[0]
  return toDateStr(period === 'month' ? startOfMonth(date) : startOfYear(date))
}

/** Every day of the period starting on `start`. */
export function periodDates(period: RecapPeriod, start: string): string[] {
  const first = parseISO(start)
  if (period === 'week') return weekDates(first)
  const last = period === 'month' ? endOfMonth(first) : endOfYear(first)
  return eachDayOfInterval({ start: first, end: last }).map(toDateStr)
}

/** The start of the period `n` periods away (negative = earlier). */
export function shiftPeriod(period: RecapPeriod, start: string, n: number): string {
  const d = parseISO(start)
  return toDateStr(period === 'week' ? addDays(d, n * 7) : period === 'month' ? addMonths(d, n) : addYears(d, n))
}

/**
 * The period a recap opens on: the last finished week or month. A year is mostly still
 * going, so it opens on this year so far, except in January, when last year is the one to see.
 */
export function defaultStart(period: RecapPeriod, now: Date): string {
  if (period === 'year') return periodStart('year', now.getMonth() === 0 ? addYears(now, -1) : now)
  return shiftPeriod(period, periodStart(period, now), -1)
}

/** "Sep 28 – Oct 4", "September 2026", "2026". */
export function periodLabel(period: RecapPeriod, start: string): string {
  const d = parseISO(start)
  if (period === 'week') return `${format(d, 'MMM d')} – ${format(addDays(d, 6), 'MMM d')}`
  return format(d, period === 'month' ? 'MMMM yyyy' : 'yyyy')
}
