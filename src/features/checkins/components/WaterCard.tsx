import { useState } from 'react'
import { GlassWater, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useSettings, DEFAULT_WATER_GOAL_ML, DEFAULT_WATER_GLASS_ML } from '@/features/settings/hooks/useSettings'
import { setWater, useWater } from '../useCheckins'
import WaterSheet from './WaterSheet'

/** Home tile: one tap on + adds a glass; tapping the tile opens the water sheet. */
export default function WaterCard({ date, today }: { date: string; today: string }) {
  const { settings } = useSettings()
  const goal = settings?.waterGoalMl ?? DEFAULT_WATER_GOAL_ML
  const glass = settings?.waterGlassMl ?? DEFAULT_WATER_GLASS_ML
  const ml = useWater(date)
  const [open, setOpen] = useState(false)
  const future = date > today
  const pct = goal > 0 ? Math.min(1, ml / goal) : 0

  async function addGlass() {
    const total = await setWater(date, current => current + glass)
    navigator.vibrate?.(10)
    if (total - glass < goal && total >= goal) toast.success('Water goal reached', { icon: '💧' })
  }

  return (
    <>
      <div className="relative flex min-h-[150px] flex-col justify-between rounded-3xl bg-card p-4">
        <div className="flex items-start justify-between">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary"><GlassWater size={20} /></span>
          <button
            type="button"
            onClick={() => void addGlass()}
            disabled={future}
            aria-label={`Add a glass of water (${glass} ml)`}
            className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full bg-sky-400/15 text-sky-300 transition-transform active:scale-90 disabled:opacity-40"
          >
            <Plus size={22} strokeWidth={2.4} />
          </button>
        </div>
        {/* Stretched button: the whole tile (except +) opens the sheet without nesting buttons. */}
        <button type="button" onClick={() => setOpen(true)} className="text-left after:absolute after:inset-0 after:rounded-3xl">
          <p className="font-semibold">Water</p>
          <p className="text-sm text-muted-foreground tabular-nums">{ml.toLocaleString()} / {goal.toLocaleString()} ml</p>
        </button>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
          <div className="h-full rounded-full bg-sky-400 transition-[width] duration-500" style={{ width: `${pct * 100}%` }} />
        </div>
      </div>
      <WaterSheet open={open} onOpenChange={setOpen} date={date} today={today} />
    </>
  )
}
