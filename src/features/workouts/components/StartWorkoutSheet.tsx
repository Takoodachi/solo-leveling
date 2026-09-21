import { Plus, ChevronRight } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import type { Routine } from '@/types'
import { CATEGORY_META } from '../categories'
import { useActiveWorkout } from '../hooks/useActiveWorkout'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  routines: Routine[]
  todayRoutine?: Routine
}

export default function StartWorkoutSheet({ open, onOpenChange, routines, todayRoutine }: Props) {
  const { startEmpty, startFromRoutine } = useActiveWorkout()
  const ordered = todayRoutine ? [todayRoutine, ...routines.filter(r => r.uuid !== todayRoutine.uuid)] : routines

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto px-4">
        <SheetHeader className="mb-2 text-left">
          <SheetTitle className="text-xl">Start a workout</SheetTitle>
          <SheetDescription>Pick a routine or start from scratch.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => { onOpenChange(false); startEmpty() }}
            className="flex items-center gap-4 rounded-2xl bg-foreground px-4 py-3.5 text-left text-background active:scale-[0.99]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-background/10"><Plus size={22} /></span>
            <span className="flex-1 font-semibold">Empty workout</span>
          </button>
          {ordered.map(r => {
            const { Icon, label } = CATEGORY_META[r.category]
            return (
              <button
                key={r.uuid}
                type="button"
                onClick={() => { onOpenChange(false); void startFromRoutine(r) }}
                className="flex items-center gap-4 rounded-2xl bg-secondary px-4 py-3.5 text-left hover:bg-accent active:scale-[0.99]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary"><Icon size={20} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{r.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {r.uuid === todayRoutine?.uuid ? 'Scheduled today · ' : ''}{label} · {r.exercises.length} exercises
                  </span>
                </span>
                <ChevronRight size={18} className="text-muted-foreground" />
              </button>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}
