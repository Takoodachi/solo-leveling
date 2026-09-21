import { Trophy } from 'lucide-react'
import { differenceInHours, endOfDay, parseISO, format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useNow } from '@/hooks/useNow'
import { CHALLENGE_METRICS } from '../metrics'
import type { ChallengeWithProgress } from '../hooks/useChallenges'

function timeLeft(c: ChallengeWithProgress, now: Date): string {
  if (c.status === 'completed') return 'Completed 🎉'
  if (c.status === 'ended') return `Ended ${format(parseISO(c.endDate), 'MMM d')}`
  if (c.status === 'upcoming') return `Starts ${format(parseISO(c.startDate), 'MMM d')}`
  const hours = Math.max(0, differenceInHours(endOfDay(parseISO(c.endDate)), now))
  const days = Math.floor(hours / 24)
  if (days === 0) return `${hours} hours left`
  return `${days} day${days === 1 ? '' : 's'} ${hours % 24} hours left`
}

interface Props {
  challenge: ChallengeWithProgress
  onClick?: () => void
}

export default function ChallengeCard({ challenge: c, onClick }: Props) {
  const now = useNow()
  const meta = CHALLENGE_METRICS[c.metric]
  const pct = c.target > 0 ? Math.min(1, c.progress / c.target) : 0

  // A plain div when used inside a link (a button can't nest in an <a>).
  const Root = onClick ? 'button' : 'div'
  return (
    <Root type={onClick ? 'button' : undefined} onClick={onClick} className="relative block w-full overflow-hidden rounded-3xl bg-card p-5 text-left active:scale-[0.99]">
      {/* Decorative glow + ghost icon in place of the design's photo */}
      <div aria-hidden="true" className="absolute inset-y-0 right-0 w-2/3 bg-[radial-gradient(120%_100%_at_100%_0%,hsl(var(--primary)/0.35),transparent_65%)]" />
      <meta.Icon aria-hidden="true" className="absolute -right-4 -top-4 h-32 w-32 rotate-12 text-white/[0.06]" strokeWidth={1.2} />

      <div className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-2 py-1 text-sm font-medium text-amber-400">
          <Trophy size={14} className="fill-amber-400" /> Challenge
        </span>
        <p className="mt-5 text-base font-semibold">{c.title}</p>
        <div className="mt-1 flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>{timeLeft(c, now)}</span>
          <span className="tabular-nums">
            {c.progress.toLocaleString()} / {c.target.toLocaleString()} {meta.unit}
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted-foreground/40">
          <div
            className={cn('h-full rounded-full transition-[width] duration-700', c.status === 'completed' ? 'bg-emerald-400' : 'bg-primary')}
            style={{ width: `${pct * 100}%` }}
          />
        </div>
      </div>
    </Root>
  )
}
