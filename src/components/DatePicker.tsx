import { useState, type ReactNode } from 'react'
import { format, parseISO } from 'date-fns'
import { CalendarDays } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import MonthGrid from '@/components/MonthGrid'
import { useNow } from '@/hooks/useNow'
import { toDateStr } from '@/lib/date'
import { cn } from '@/lib/utils'

// The same box as `Input`, with the calendar at its right end
const FIELD = 'flex h-12 w-full items-center justify-between gap-2 rounded-2xl bg-secondary px-4 text-left text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm'

interface Props {
  /** The day picked, "yyyy-MM-dd" (none yet when left out). */
  value: string | undefined
  onChange: (day: string) => void
  /** The first and last day that can be picked. */
  min?: string
  max?: string
  /** For a date that can be left out: offers "Clear". */
  onClear?: () => void
  /** The button that opens the calendar. Without these it is a form field with the date in it. */
  className?: string
  children?: ReactNode
  id?: string
  'aria-label'?: string
}

/**
 * A date, picked from a calendar: the one way to choose a day anywhere in the app (the day on
 * show on Home, Nutrition and the recap, a weigh-in's date, when a workout was done), so no
 * screen makes you step there a day at a time. The browsers' own date fields were replaced by
 * it: theirs look and work differently on every phone.
 */
export default function DatePicker({ value, onChange, min, max, onClear, className, children, id, 'aria-label': label }: Props) {
  const today = toDateStr(useNow())
  const [open, setOpen] = useState(false)
  // The month paged to while it's open; it opens on the picked day's
  const [month, setMonth] = useState<string | null>(null)
  const allowed = (day: string) => (!min || day >= min) && (!max || day <= max)

  function show(next: boolean) {
    setOpen(next)
    if (!next) setMonth(null)
  }

  function pick(day: string) {
    onChange(day)
    show(false)
  }

  return (
    <>
      <button type="button" id={id} onClick={() => show(true)} aria-haspopup="dialog" aria-label={label} className={className ?? FIELD}>
        {children ?? (
          <>
            <span className={cn('min-w-0 truncate', !value && 'text-muted-foreground')}>{value ? format(parseISO(value), 'MMM d, yyyy') : 'Pick a date'}</span>
            <CalendarDays size={18} className="shrink-0 text-muted-foreground" />
          </>
        )}
      </button>
      <Dialog open={open} onOpenChange={show}>
        <DialogContent className="max-w-xs gap-2 p-4" aria-describedby={undefined}>
          <DialogHeader className="h-7 justify-center text-left">
            <DialogTitle className="text-base">Pick a date</DialogTitle>
          </DialogHeader>
          <MonthGrid
            month={month ?? (value ?? today).slice(0, 7)}
            onMonth={setMonth}
            min={min?.slice(0, 7)}
            max={max?.slice(0, 7)}
            day={(day, date) => (
              <button
                type="button"
                disabled={!allowed(day)}
                onClick={() => pick(day)}
                aria-pressed={day === value}
                aria-label={format(date, 'EEEE d MMMM yyyy')}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full text-sm tabular-nums transition-colors disabled:opacity-30',
                  day === today && 'font-bold ring-1 ring-foreground/30',
                  day === value ? 'bg-primary font-bold text-primary-foreground' : 'hover:bg-accent',
                )}
              >
                {format(date, 'd')}
              </button>
            )}
          />
          {(allowed(today) || (onClear && value)) && (
            <div className="flex gap-2">
              {onClear && value && (
                <Button type="button" variant="secondary" size="sm" className="flex-1" onClick={() => { onClear(); show(false) }}>Clear</Button>
              )}
              {allowed(today) && (
                <Button type="button" variant="secondary" size="sm" className="flex-1" onClick={() => pick(today)}>Today</Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
