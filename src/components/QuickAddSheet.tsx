import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Dumbbell, Utensils, Scale, Footprints, GlassWater, ChevronRight, type LucideIcon } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import LogStepsSheet from '@/features/dashboard/components/LogStepsSheet'
import WaterSheet from '@/features/checkins/components/WaterSheet'
import { useNow } from '@/hooks/useNow'
import { toDateStr } from '@/lib/date'
import { db } from '@/db'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function QuickAddSheet({ open, onOpenChange }: Props) {
  const navigate = useNavigate()
  const [stepsOpen, setStepsOpen] = useState(false)
  const [waterOpen, setWaterOpen] = useState(false)
  const todayStr = toDateStr(useNow())
  const hasDraft = useLiveQuery(async () => !!(await db.workoutDrafts.get(1)), [])

  const actions: { label: string; hint: string; Icon: LucideIcon; run: () => void }[] = [
    {
      label: hasDraft ? 'Resume workout' : 'Start workout',
      hint: hasDraft ? 'Pick up where you left off' : 'Empty session or pick a routine',
      Icon: Dumbbell,
      run: () => navigate(hasDraft ? '/workouts/active' : '/workouts?start=1'),
    },
    { label: 'Log food', hint: 'Add to today’s meals', Icon: Utensils, run: () => navigate('/nutrition?add=1') },
    { label: 'Log weight', hint: 'Track your body weight', Icon: Scale, run: () => navigate('/analytics/weight') },
    { label: 'Log steps', hint: 'Feeds your activity targets', Icon: Footprints, run: () => setStepsOpen(true) },
    { label: 'Log water', hint: 'Add a glass or set today’s total', Icon: GlassWater, run: () => setWaterOpen(true) },
  ]

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto px-4">
          <SheetHeader className="mb-2 text-left">
            <SheetTitle className="text-xl">Quick add</SheetTitle>
            <SheetDescription>What do you want to log?</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-2">
            {actions.map(({ label, hint, Icon, run }) => (
              <button
                key={label}
                type="button"
                onClick={() => { onOpenChange(false); run() }}
                className="flex items-center gap-4 rounded-2xl bg-secondary px-4 py-3.5 text-left transition-colors hover:bg-accent active:scale-[0.99]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Icon size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{label}</span>
                  <span className="block text-xs text-muted-foreground">{hint}</span>
                </span>
                <ChevronRight size={18} className="text-muted-foreground" />
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
      <LogStepsSheet open={stepsOpen} onOpenChange={setStepsOpen} />
      <WaterSheet open={waterOpen} onOpenChange={setWaterOpen} date={todayStr} today={todayStr} />
    </>
  )
}
