import { Link } from 'react-router-dom'
import { Flame, Star } from 'lucide-react'
import { useGamification, xpForLevel } from '@/features/gamification/store'
import { clampPercent } from '@/lib/format'

export default function StreakLevelCard() {
  const { xp, level, currentStreak } = useGamification()
  const needed = xpForLevel(level)
  const pct = clampPercent(xp, needed)

  return (
    <Link to="/profile" className="grid grid-cols-[auto_1fr] items-center gap-4 rounded-3xl bg-card p-4">
      <div className="flex items-center gap-2 border-r border-white/5 pr-4">
        <Flame size={22} className={currentStreak > 0 ? 'fill-primary text-primary' : 'text-muted-foreground'} />
        <div>
          <p className="text-lg font-bold leading-none">{currentStreak}</p>
          <p className="text-[11px] text-muted-foreground">day streak</p>
        </div>
      </div>
      <div className="min-w-0">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 font-semibold"><Star size={15} className="fill-amber-300 text-amber-300" />Level {level}</span>
          <span className="text-xs text-muted-foreground tabular-nums">{xp} / {needed} XP</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </Link>
  )
}
