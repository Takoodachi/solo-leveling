import { format, parseISO, isToday, isYesterday, startOfWeek, getISOWeek, addDays, subDays } from 'date-fns'

export function toDateStr(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function today(): string {
  return toDateStr(new Date())
}

export function parseDate(dateStr: string): Date {
  return parseISO(dateStr)
}

export function formatDisplayDate(dateStr: string): string {
  const date = parseISO(dateStr)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'EEE, MMM d')
}

export function formatShortDate(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM d')
}

export function getWeekStart(date: Date): string {
  return toDateStr(startOfWeek(date, { weekStartsOn: 1 }))
}

export function getISOWeekNumber(date: Date): number {
  return getISOWeek(date)
}

/** The 7 dates (Mon → Sun) of the week containing `date`. */
export function weekDates(date: Date): string[] {
  const start = startOfWeek(date, { weekStartsOn: 1 })
  return Array.from({ length: 7 }, (_, i) => toDateStr(addDays(start, i)))
}

/** The last `n` dates ending today (oldest first), in local time. */
export function lastNDays(n: number, end: Date = new Date()): string[] {
  return Array.from({ length: n }, (_, i) => toDateStr(subDays(end, n - 1 - i)))
}
