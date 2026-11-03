import { useState } from 'react'
import { toast } from 'sonner'
import { Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { answerCheckIn, useWeeklyCheckIn } from '../checkIn'

const signed = (n: number) => (n === 0 ? '' : ` (${n > 0 ? '+' : '−'}${Math.abs(n).toLocaleString()})`)

function paceText(pace: number): string {
  if (pace === 0) return 'Holding your weight steady'
  return `${pace < 0 ? 'Losing' : 'Gaining'} ${Math.round(Math.abs(pace) * 100) / 100}% of your weight a week`
}

/** Home: the week's new targets, from what the logs say is burned, to apply or keep (see checkIn.ts). */
export default function WeeklyCheckInCard({ today }: { today: string }) {
  const [checkIn, setCheckIn] = useWeeklyCheckIn(today)
  const [busy, setBusy] = useState(false)
  if (!checkIn) return null
  const { next, current, workouts } = checkIn

  async function answer(apply: boolean) {
    if (!checkIn) return
    setBusy(true)
    await answerCheckIn(checkIn, apply)
    setCheckIn(null)
    if (apply) toast.success('This week’s targets are set')
  }

  return (
    <section className="flex flex-col gap-3 rounded-3xl bg-card p-5" aria-label="Weekly check-in">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"><Target size={20} /></span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-muted-foreground">Weekly check-in</p>
          <p className="font-semibold">New targets for this week</p>
        </div>
      </div>
      <div className="rounded-2xl bg-secondary px-4 py-3">
        <p className="text-lg font-bold tabular-nums">
          {next.dailyKcal.toLocaleString()} kcal<span className="text-sm font-medium text-muted-foreground">{signed(next.dailyKcal - current.dailyKcal)}</span>
        </p>
        <p className="text-sm tabular-nums text-muted-foreground">
          Protein {next.dailyProtein} g · Carbs {next.dailyCarbs} g · Fat {next.dailyFat} g
        </p>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        From your logs you burn about {checkIn.burn.toLocaleString()} kcal a day. {paceText(checkIn.pace)}
        {checkIn.trimmed ? ', kept small while training is under half your plan.' : '.'}
        {checkIn.held && ' Changed by at most 150 kcal a week, so it settles in gently.'}
        {workouts && workouts.planned > 0 && ` You did ${workouts.done} of ${workouts.planned} planned workouts in the last four weeks.`}
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" disabled={busy} onClick={() => void answer(false)}>Keep mine</Button>
        <Button className="flex-1" disabled={busy} onClick={() => void answer(true)}>Apply</Button>
      </div>
    </section>
  )
}
