import { Check, Moon } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { Routine } from '@/types'
import { cn } from '@/lib/utils'
import { CATEGORY_META } from '../categories'
import { setDayRoutine } from '../hooks/useRoutines'

interface Props {
  day: number | null
  dayLabel: string
  routines: Routine[]
  onClose: () => void
}

/** Pick which routine (or rest) a weekday gets. */
export default function DayRoutineSheet({ day, dayLabel, routines, onClose }: Props) {
  const current = day == null ? undefined : routines.find(r => r.scheduleDays.includes(day))

  async function choose(uuid: string | null) {
    if (day == null) return
    await setDayRoutine(day, uuid)
    onClose()
  }

  const row = (active: boolean) =>
    cn('flex items-center gap-4 rounded-2xl px-4 py-3.5 text-left', active ? 'bg-foreground text-background' : 'bg-secondary hover:bg-accent')

  return (
    <Sheet open={day != null} onOpenChange={o => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto px-4">
        <SheetHeader className="mb-2 text-left">
          <SheetTitle className="text-xl">{dayLabel}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-2">
          <button type="button" className={row(!current)} onClick={() => void choose(null)}>
            <Moon size={20} />
            <span className="flex-1 font-semibold">Rest day</span>
            {!current && <Check size={18} />}
          </button>
          {routines.map(r => {
            const { Icon, label } = CATEGORY_META[r.category]
            const active = current?.uuid === r.uuid
            return (
              <button key={r.uuid} type="button" className={row(active)} onClick={() => void choose(r.uuid)}>
                <Icon size={20} className={active ? '' : 'text-primary'} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{r.name}</span>
                  <span className={cn('block text-xs', active ? 'text-background/70' : 'text-muted-foreground')}>{label} · {r.exercises.length} exercises</span>
                </span>
                {active && <Check size={18} />}
              </button>
            )
          })}
          {routines.length === 0 && (
            <p className="px-1 py-4 text-sm text-muted-foreground">Create or save a routine first, then schedule it here.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
