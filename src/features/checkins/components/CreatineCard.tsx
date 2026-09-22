import { motion } from 'framer-motion'
import { Check, Pill } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toggleCheckin, useCheckin, useCheckinStreak } from '../useCheckins'

/** One-tap daily creatine tick for the selected Home day. */
export default function CreatineCard({ date, today }: { date: string; today: string }) {
  const done = useCheckin('creatine', date)
  const streak = useCheckinStreak('creatine', today)
  const isToday = date === today
  const future = date > today

  let status = isToday ? 'Tap once you’ve had today’s dose' : 'Not logged'
  if (done) status = isToday ? 'Taken today' : 'Taken'
  if (future) status = 'Upcoming'

  async function handleTap() {
    if (future) return
    if (await toggleCheckin('creatine', date)) navigator.vibrate?.(12)
  }

  return (
    <button
      type="button"
      onClick={() => void handleTap()}
      disabled={future}
      aria-pressed={done}
      className="flex w-full items-center gap-3 rounded-3xl bg-card p-4 text-left disabled:opacity-60"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        <Pill size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">Creatine</span>
        <span className="block truncate text-sm text-muted-foreground">
          {status}
          {isToday && streak >= 2 && <> · {streak}-day streak</>}
        </span>
      </span>
      <motion.span
        key={String(done)}
        initial={done ? { scale: 0.6 } : false}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 11, stiffness: 300 }}
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          done ? 'border-primary bg-primary text-white' : 'border-white/20 text-transparent',
        )}
      >
        <Check size={20} strokeWidth={3} />
      </motion.span>
    </button>
  )
}
