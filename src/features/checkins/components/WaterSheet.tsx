import { Minus, Plus } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import Segmented from '@/components/Segmented'
import { formatDisplayDate } from '@/lib/date'
import { useSettings, DEFAULT_WATER_GOAL_ML, DEFAULT_WATER_GLASS_ML } from '@/features/settings/hooks/useSettings'
import { setWater, useWater } from '../useCheckins'

const GOALS = [1500, 2000, 2500, 3000, 3500, 4000].map(ml => ({ value: String(ml), label: `${ml / 1000} L` }))
const GLASSES = [150, 200, 250, 330, 500].map(ml => ({ value: String(ml), label: String(ml) }))
const EXTRAS = [100, 330, 500]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  today: string
}

/** Fine control for the day's water: undo a glass, odd amounts, goal and glass size. */
export default function WaterSheet({ open, onOpenChange, date, today }: Props) {
  const { settings, updateSettings } = useSettings()
  const goal = settings?.waterGoalMl ?? DEFAULT_WATER_GOAL_ML
  const glass = settings?.waterGlassMl ?? DEFAULT_WATER_GLASS_ML
  const ml = useWater(date)
  const future = date > today
  const pct = goal > 0 ? Math.min(1, ml / goal) : 0
  const add = (delta: number) => void setWater(date, current => current + delta)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto px-4">
        <SheetHeader className="text-left">
          <SheetTitle className="text-xl">Water · {formatDisplayDate(date)}</SheetTitle>
          <SheetDescription>Tap + on the Home card to add a glass in one go.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col items-center gap-1 py-5">
          <p className="font-heading text-5xl font-bold tabular-nums">
            {ml.toLocaleString()}<span className="ml-1 text-xl text-muted-foreground">ml</span>
          </p>
          <p className="text-sm text-muted-foreground">of {goal.toLocaleString()} ml goal</p>
          <div className="mt-3 h-2 w-full max-w-xs overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-sky-400 transition-[width] duration-500" style={{ width: `${pct * 100}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" className="gap-1.5" disabled={future || ml === 0} onClick={() => add(-glass)}>
            <Minus size={16} /> {glass} ml
          </Button>
          <Button className="gap-1.5" disabled={future} onClick={() => add(glass)}>
            <Plus size={16} /> {glass} ml
          </Button>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {EXTRAS.map(v => (
            <Button key={v} variant="secondary" size="sm" disabled={future} onClick={() => add(v)}>+{v}</Button>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Daily goal</Label>
            <Segmented size="sm" value={String(goal)} options={GOALS} onChange={v => void updateSettings({ waterGoalMl: Number(v) })} className="bg-secondary" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Glass size (ml)</Label>
            <Segmented size="sm" value={String(glass)} options={GLASSES} onChange={v => void updateSettings({ waterGlassMl: Number(v) })} className="bg-secondary" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
