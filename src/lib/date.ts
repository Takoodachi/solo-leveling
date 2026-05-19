import { format, parseISO, isToday, isYesterday, startOfWeek, getISOWeek } from 'date-fns'

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
