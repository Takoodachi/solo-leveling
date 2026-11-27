import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { tap } from '@/lib/haptics'
import { homeWidgetDef } from '@/features/dashboard/homeWidgets'
import { toggleCheckin, useCheckin, useCheckinStreak, type Supplement } from '../useCheckins'

/** Home tile: one tap ticks off the selected day's creatine or magnesium. */
export default function SupplementCard({ kind, date, today }: { kind: Supplement; date: string; today: string }) {
  const done = useCheckin(kind, date)
  const streak = useCheckinStreak(kind, today)
  const def = homeWidgetDef(kind)
  const isToday = date === today
  const future = date > today

  let status = isToday ? 'Tap when taken' : 'Not logged'
  if (done) status = isToday ? 'Taken today' : 'Taken'
  if (future) status = 'Upcoming'

  async function handleTap() {
    if (future) return
    if (!done) tap() // inside the tap: iPhones only tick from a touch
    await toggleCheckin(kind, date)
  }

  if (!def) return null
  return (
    <button
      type="button"
      id={kind} // its reminder opens /home#creatine or /home#magnesium
      onClick={() => void handleTap()}
      disabled={future}
      aria-pressed={done}
      className="flex min-h-[150px] flex-col justify-between rounded-3xl bg-card p-4 text-left disabled:opacity-60"
    >
      <span className="flex w-full items-start justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary"><def.icon size={20} /></span>
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
        <span className="block font-semibold">{def.label}</span>
        <span className="block text-sm text-muted-foreground">
          {status}
          {isToday && streak >= 2 && <> · {streak}-day streak</>}
        </span>
      </span>
    </button>
  )
}
