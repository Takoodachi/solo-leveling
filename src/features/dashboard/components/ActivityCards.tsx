import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Footprints, Flame } from 'lucide-react'
import ProgressRing from '@/components/ProgressRing'
import LogStepsSheet from './LogStepsSheet'

interface StepsProps {
  date: string
  steps: number
  goal: number
}

/** "Steps 8,104 / 10,000" with a percentage ring — tap to log. */
export function StepsCard({ date, steps, goal }: StepsProps) {
  const [open, setOpen] = useState(false)
  const pct = goal > 0 ? steps / goal : 0
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex min-h-[150px] flex-col justify-between rounded-3xl bg-card p-4 text-left active:scale-[0.99]">
        <div className="flex items-start justify-between">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary"><Footprints size={20} /></span>
          <ProgressRing value={pct} size={64} stroke={4}>
            <span className="text-sm font-medium">{Math.round(pct * 100)}%</span>
          </ProgressRing>
        </div>
        <div>
          <p className="font-semibold">Steps</p>
          <p className="text-sm text-muted-foreground tabular-nums">{steps.toLocaleString()} / {goal.toLocaleString()}</p>
        </div>
      </button>
      <LogStepsSheet open={open} onOpenChange={setOpen} date={date} />
    </>
  )
}

interface CaloriesProps {
  eaten: number
  /** What steps burned (subtracted from what was eaten). */
  burned: number
  target: number
  macros: { protein: number; carbs: number; fat: number }
  macroTargets: { protein: number; carbs: number; fat: number }
}

/** Takes the "heart rate" slot from the design: net calories (eaten − steps) vs target with mini macro bars. */
export function CaloriesCard({ eaten, burned, target, macros, macroTargets }: CaloriesProps) {
  const bars = [
    { key: 'P', v: macros.protein / (macroTargets.protein || 1) },
    { key: 'C', v: macros.carbs / (macroTargets.carbs || 1) },
    { key: 'F', v: macros.fat / (macroTargets.fat || 1) },
  ]
  return (
    <Link to="/nutrition" className="flex min-h-[150px] flex-col justify-between rounded-3xl bg-card p-4 active:scale-[0.99]">
      <div className="flex items-start justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary"><Flame size={20} /></span>
        <div className="flex h-14 items-end gap-1.5" aria-hidden="true">
          {bars.map(b => (
            <div key={b.key} className="flex flex-col items-center gap-1">
              <div className="flex h-10 w-2 items-end overflow-hidden rounded-full bg-secondary">
                <div className="w-full rounded-full bg-primary" style={{ height: `${Math.min(1, b.v) * 100}%` }} />
              </div>
              <span className="text-[9px] font-semibold text-muted-foreground">{b.key}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="font-semibold">Calories</p>
        <p className="text-sm text-muted-foreground tabular-nums">{Math.round(eaten - burned).toLocaleString()} / {target.toLocaleString()} kcal</p>
        {burned > 0 && <p className="text-xs text-muted-foreground tabular-nums">incl. −{burned.toLocaleString()} from steps</p>}
      </div>
    </Link>
  )
}
