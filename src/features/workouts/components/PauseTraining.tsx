import { useState } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { CalendarDays, ChevronRight, CirclePause } from 'lucide-react'
import DatePicker from '@/components/DatePicker'
import { Button, buttonVariants } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toDateStr } from '@/lib/date'
import { cn } from '@/lib/utils'
import { setPause } from '../pause'

const LENGTHS = [
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '4 weeks', days: 28 },
]

const ROW = 'flex w-full items-center gap-4 rounded-2xl bg-secondary px-4 py-3.5 text-left hover:bg-accent'
const day = (date: string) => format(parseISO(date), 'EEE, MMM d')

interface Props {
  today: string
  /** The day the plan comes back while training is paused (pause.ts), else null. */
  until: string | null
}

/** Workouts → Plan: pause training for a while (a sheet of lengths), or, while paused, when it's back, Change date and Resume now. */
export default function PauseTraining({ today, until }: Props) {
  const [open, setOpen] = useState(false)
  const inDays = (n: number) => toDateStr(addDays(parseISO(today), n))
  const pause = (back: string) => {
    void setPause(today, back)
    setOpen(false)
  }

  if (until) {
    return (
      <div className="rounded-3xl bg-card p-4">
        <div className="flex items-center gap-3">
          <CirclePause size={18} className="shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Paused until <span className="whitespace-nowrap">{day(until)}</span></span>
            <span className="block text-sm text-muted-foreground">Your plan comes back by itself that day</span>
          </span>
        </div>
        <div className="mt-3 flex gap-2">
          {/* A new end, sooner or later: the days already paused stay as they were */}
          <DatePicker value={until} min={inDays(1)} max={inDays(365)} onChange={back => void setPause(today, back)}
            aria-label="Change the day training comes back" className={cn(buttonVariants({ variant: 'secondary' }), 'flex-1')}>
            <CalendarDays /> Change date
          </DatePicker>
          <Button variant="secondary" className="flex-1" onClick={() => void setPause(today, null)}>Resume now</Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-3 rounded-3xl bg-card p-4 text-left">
        <CirclePause size={18} className="shrink-0 text-primary" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Pause training</span>
          <span className="block text-sm text-muted-foreground">A break from your plan that ends by itself</span>
        </span>
        <ChevronRight size={18} className="text-muted-foreground" />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto px-4">
          <SheetHeader className="mb-2 text-left">
            <SheetTitle className="text-xl">Pause training</SheetTitle>
            <SheetDescription>
              While it’s on, there are no workout or stretching reminders, and the days on your plan are days off.
              Creatine, food and your other reminders keep going, and your plan comes back by itself.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-2">
            {LENGTHS.map(l => (
              <button key={l.days} type="button" className={ROW} onClick={() => pause(inDays(l.days))}>
                <span className="flex-1 font-semibold">{l.label}</span>
                <span className="text-sm text-muted-foreground">Back {day(inDays(l.days))}</span>
              </button>
            ))}
            <DatePicker value={undefined} min={inDays(1)} max={inDays(365)} onChange={pause} aria-label="Pause until a date you pick" className={ROW}>
              <span className="flex-1 font-semibold">Until a date…</span>
              <CalendarDays size={18} className="text-muted-foreground" />
            </DatePicker>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
