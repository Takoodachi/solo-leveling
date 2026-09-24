import { format, parseISO } from 'date-fns'
import { Check } from 'lucide-react'
import ProgressRing from '@/components/ProgressRing'
import { cn } from '@/lib/utils'
import type { DaySummary } from '../hooks/useWeekSummary'

interface Props {
  days: DaySummary[]
  selected: string
  today: string
  /** The selected day's net calories as a share of the target. */
  kcalProgress: number
  scheduledWeekdays: Set<number>
  onSelect: (date: string) => void
}

/**
 * Mon–Sun day selector. A white check = trained that day; the selected day shows
 * its calorie progress as an orange arc. Missed days stay neutral (no guilt marks).
 */
export default function WeekStrip({ days, selected, today, kcalProgress, scheduledWeekdays, onSelect }: Props) {
  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map(d => {
        const date = parseISO(d.date)
        const isSelected = d.date === selected
        const trained = d.workouts > 0
        const planned = !trained && d.date >= today && scheduledWeekdays.has(date.getDay())
        return (
          <button
            key={d.date}
            type="button"
            onClick={() => onSelect(d.date)}
            aria-pressed={isSelected}
            aria-label={format(date, 'EEEE d MMMM')}
            className="flex flex-col items-center gap-2 py-1"
          >
            <span className={cn('text-sm', isSelected ? 'font-bold text-foreground' : 'text-muted-foreground')}>
              {format(date, 'd')}
            </span>
            {trained ? (
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-foreground text-background">
                <Check size={22} strokeWidth={3} />
              </span>
            ) : isSelected ? (
              <ProgressRing value={kcalProgress} size={44} stroke={3} trackColor="hsl(var(--muted-foreground) / 0.35)" className="rounded-full bg-card" />
            ) : (
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-card">
                {planned && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
              </span>
            )}
            <span className={cn('text-sm', isSelected ? 'font-bold text-foreground' : 'text-muted-foreground')}>
              {format(date, 'EEEEE')}
            </span>
            <span className={cn('-mt-1.5 h-1 w-1 rounded-full', d.date === today ? 'bg-foreground' : 'bg-transparent')} />
          </button>
        )
      })}
    </div>
  )
}
