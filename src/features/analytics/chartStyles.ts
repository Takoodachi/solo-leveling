import { formatDayDate } from '@/lib/date'

// Shared Recharts styling so every chart matches the dark theme.
export const tooltipStyle = {
  background: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 12,
  fontSize: 12,
} as const

export const axisTick = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } as const

/**
 * A tooltip's heading for a chart over dates (`labelFormatter={dayLabel}`): the point's date
 * with its day of the week ("Monday, Oct 12"). The axis keeps the short "Oct 12"; the chart's
 * rows carry the day itself as `date` (YYYY-MM-DD).
 */
export function dayLabel(label: unknown, payload: readonly { payload?: unknown }[]): string {
  const date = (payload[0]?.payload as { date?: unknown } | undefined)?.date
  return typeof date === 'string' ? formatDayDate(date) : String(label)
}

/** Axis labels like 850, 1.4k, 12k (one decimal below 10k so ticks stay distinct). */
export function compactNumber(v: number): string {
  if (v < 1000) return String(Math.round(v))
  return v < 10_000 ? `${Number((v / 1000).toFixed(1))}k` : `${Math.round(v / 1000)}k`
}
