import { Check, Pill } from 'lucide-react'
import { cn } from '@/lib/utils'
import { tap } from '@/lib/haptics'
import { toggleCheckin, useCheckin, useCheckinStreak } from '../useCheckins'

/** Home tile: one tap ticks off the selected day's creatine. */
export default function CreatineCard({ date, today }: { date: string; today: string }) {
  const done = useCheckin('creatine', date)
  const streak = useCheckinStreak('creatine', today)
  const isToday = date === today
  const future = date > today

  let status = isToday ? 'Tap when taken' : 'Not logged'
  if (done) status = isToday ? 'Taken today' : 'Taken'
  if (future) status = 'Upcoming'

  async function handleTap() {
    if (future) return
    if (!done) tap() // inside the tap: iPhones only tick from a touch
    await toggleCheckin('creatine', date)
  }

  return (
    <button
      type="button"
      id="creatine" // the creatine reminder opens /home#creatine
      onClick={() => void handleTap()}
      disabled={future}
      aria-pressed={done}
      className="flex min-h-[150px] flex-col justify-between rounded-3xl bg-card p-4 text-left active:scale-[0.99] disabled:opacity-60"
    >
      <span className="flex w-full items-start justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary"><Pill size={20} /></span>
        <span
          key={String(done)}
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-full border-2 transition-colors',
            done ? 'animate-pop border-primary bg-primary text-primary-foreground' : 'border-foreground/20 text-transparent',
          )}
        >
          <Check size={22} strokeWidth={3} />
        </span>
      </span>
      <span className="block">
        <span className="block font-semibold">Creatine</span>
        <span className="block text-sm text-muted-foreground">
          {status}
          {isToday && streak >= 2 && <> · {streak}-day streak</>}
        </span>
      </span>
    </button>
  )
}
