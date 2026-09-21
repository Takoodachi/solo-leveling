import { useState } from 'react'
import { addDays, format } from 'date-fns'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ChallengeMetric } from '@/types'
import { cn } from '@/lib/utils'
import { today } from '@/lib/date'
import { CHALLENGE_METRICS, METRIC_KEYS } from '../metrics'
import { saveChallenge } from '../hooks/useChallenges'

const DURATIONS = [7, 14, 30, 60]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function NewChallengeSheet({ open, onOpenChange }: Props) {
  const [metric, setMetric] = useState<ChallengeMetric>('workouts')
  const [target, setTarget] = useState(String(CHALLENGE_METRICS.workouts.defaultTarget))
  const [days, setDays] = useState(30)
  const [title, setTitle] = useState<string | null>(null)

  const meta = CHALLENGE_METRICS[metric]
  const targetNum = Math.max(1, Math.round(Number(target) || 0))
  const autoTitle = meta.title(targetNum)

  function pickMetric(m: ChallengeMetric) {
    setMetric(m)
    setTarget(String(CHALLENGE_METRICS[m].defaultTarget))
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    const start = today()
    await saveChallenge({
      uuid: crypto.randomUUID(),
      title: title?.trim() || autoTitle,
      metric,
      target: targetNum,
      startDate: start,
      endDate: format(addDays(new Date(`${start}T12:00:00`), days - 1), 'yyyy-MM-dd'),
      createdAt: Date.now(),
    })
    toast.success('Challenge started — good luck!')
    setTitle(null)
    onOpenChange(false)
  }

  const chip = (active: boolean) =>
    cn('h-10 rounded-full px-4 text-sm font-medium transition-colors', active ? 'bg-foreground text-background' : 'bg-secondary text-foreground/80')

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto px-4">
        <SheetHeader className="mb-2 text-left">
          <SheetTitle className="text-xl">New challenge</SheetTitle>
          <SheetDescription>A personal goal with a deadline. Only you can see it.</SheetDescription>
        </SheetHeader>
        <form onSubmit={create} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label>What to track</Label>
            <div className="flex flex-wrap gap-2">
              {METRIC_KEYS.map(m => (
                <button key={m} type="button" className={chip(metric === m)} onClick={() => pickMetric(m)}>
                  {CHALLENGE_METRICS[m].label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ch-target">Target ({meta.unit})</Label>
            <Input id="ch-target" inputMode="numeric" value={target} onChange={e => setTarget(e.target.value.replace(/\D/g, ''))} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Duration</Label>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map(d => <button key={d} type="button" className={chip(days === d)} onClick={() => setDays(d)}>{d} days</button>)}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ch-title">Name</Label>
            <Input id="ch-title" value={title ?? autoTitle} onChange={e => setTitle(e.target.value)} />
          </div>
          <Button type="submit" size="lg">Start challenge</Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
