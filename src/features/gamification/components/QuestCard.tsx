import { Check, Swords } from 'lucide-react'
import { cn } from '@/lib/utils'
import { XP } from '@/lib/xp'
import { useQuest } from '../useDailyQuest'

/**
 * Home card: the day's quest, each objective with where it stands. Today's shows the XP on
 * offer; a past day only says what was done (an unfinished one is just a day, not a miss).
 */
export default function QuestCard({ date, today }: { date: string; today: string }) {
  const quest = useQuest(date)
  if (!quest || date > today) return null

  const done = quest.objectives.filter(o => o.done).length
  const isToday = date === today
  const paid = quest.claimed || (isToday && quest.complete)

  return (
    <section className={cn('rounded-3xl bg-card p-5', paid && 'ring-1 ring-primary/40')} aria-label="Daily quest">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"><Swords size={19} /></span>
          <div className="min-w-0">
            <p className="eyebrow text-muted-foreground">Daily quest</p>
            <p className="truncate font-semibold leading-tight">
              {quest.complete ? 'Quest complete' : `${done} of ${quest.objectives.length} done`}
            </p>
          </div>
        </div>
        {(isToday || paid) && (
          <span className={cn('flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums', paid ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground/80')}>
            {paid && <Check size={12} strokeWidth={3.5} />}+{XP.DAILY_QUEST} XP
          </span>
        )}
      </div>

      <ul className="mt-4 flex flex-col gap-2.5">
        {quest.objectives.map(o => (
          <li key={o.id} className="flex items-center gap-3">
            <span
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                o.done ? 'border-primary bg-primary text-primary-foreground' : 'border-foreground/20',
              )}
              aria-hidden="true"
            >
              {o.done && <Check size={12} strokeWidth={3.5} />}
            </span>
            <span className={cn('min-w-0 flex-1 text-sm', o.done && 'text-muted-foreground')}>
              {o.label}
              <span className="sr-only">{o.done ? ' (done)' : ' (not done yet)'}</span>
            </span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{o.progress}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
