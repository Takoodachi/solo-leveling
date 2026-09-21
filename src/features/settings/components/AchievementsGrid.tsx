import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useGamification } from '@/features/gamification/store'

export default function AchievementsGrid() {
  const { allAchievements } = useGamification()
  const sorted = [
    ...allAchievements.filter(a => a.unlocked).sort((a, b) => (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0)),
    ...allAchievements.filter(a => !a.unlocked),
  ]
  const unlocked = sorted.filter(a => a.unlocked).length

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Achievements</h2>
        <span className="text-sm text-muted-foreground">{unlocked} / {sorted.length}</span>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {sorted.map(a => (
          <div
            key={a.key}
            title={a.description}
            className={cn('flex flex-col items-center gap-1.5 rounded-3xl bg-card px-2 py-4 text-center', !a.unlocked && 'opacity-45')}
          >
            <span className={cn('text-3xl', !a.unlocked && 'grayscale')} aria-hidden="true">{a.icon}</span>
            <p className="text-xs font-semibold leading-tight">{a.title}</p>
            <p className="text-[10px] leading-tight text-muted-foreground">
              {a.unlocked && a.unlockedAt ? format(new Date(a.unlockedAt), 'MMM d, yyyy') : a.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
