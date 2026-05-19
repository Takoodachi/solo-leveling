import { useNavigate } from 'react-router-dom'
import { Flame, Star, Trophy, Scale, ShieldCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import StatCard from '@/components/StatCard'
import { useGamification, xpForLevel } from '@/features/gamification/store'
import { ACHIEVEMENT_DEFS } from '@/features/gamification/achievements'
import { clampPercent } from '@/lib/format'
import { format } from 'date-fns'

export default function StatsPage() {
  const navigate = useNavigate()
  const { xp, level, currentStreak, longestStreak, streakFreezes, achievements } = useGamification()

  const xpNeeded = xpForLevel(level)
  const xpPercent = clampPercent(xp, xpNeeded)

  return (
    <div className="p-4 flex flex-col gap-6">
      <h1 className="text-xl font-bold">Stats</h1>

      {/* Streak */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Streak</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Current streak"
            value={`${currentStreak} day${currentStreak !== 1 ? 's' : ''}`}
            Icon={Flame}
            iconClassName={currentStreak > 0 ? 'text-orange-400' : 'text-muted-foreground'}
          />
          <StatCard
            label="Longest streak"
            value={`${longestStreak} day${longestStreak !== 1 ? 's' : ''}`}
            Icon={Flame}
            iconClassName="text-muted-foreground"
          />
        </div>
        {streakFreezes > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck size={16} className="text-blue-400" />
            <span>{streakFreezes} streak freeze{streakFreezes !== 1 ? 's' : ''} available</span>
          </div>
        )}
      </section>

      {/* Level + XP */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Level</h2>
        <Card>
          <CardContent className="p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Star size={20} className="text-yellow-400" />
                </div>
                <div>
                  <p className="font-semibold">Level {level}</p>
                  <p className="text-xs text-muted-foreground">{xp} / {xpNeeded} XP</p>
                </div>
              </div>
              <Badge variant="secondary">Lv.{level}</Badge>
            </div>
            <Progress value={xpPercent} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {xpNeeded - xp} XP to level {level + 1}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Body weight */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Body</h2>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Scale size={20} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Track your weight over time</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/stats/weight')}>
              Open
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Achievements */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Achievements</h2>
        {achievements.length === 0 ? (
          <Card>
            <CardContent className="p-4 flex flex-col items-center gap-2 py-8">
              <Trophy size={32} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">
                No achievements yet — keep logging!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {achievements.map(a => {
              const def = ACHIEVEMENT_DEFS.find(d => d.key === a.key)
              return (
                <Card key={a.uuid}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <span className="text-2xl">{def?.icon ?? '🏆'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{def?.title ?? a.key}</p>
                      {def?.description && (
                        <p className="text-xs text-muted-foreground">{def.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(a.unlockedAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
