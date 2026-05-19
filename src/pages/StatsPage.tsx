import { useNavigate } from 'react-router-dom'
import { Flame, Star, Trophy, Scale, ShieldCheck, Lock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ResponsiveContainer, LineChart, Line, YAxis } from 'recharts'
import StatCard from '@/components/StatCard'
import { useGamification, xpForLevel } from '@/features/gamification/store'
import { clampPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { useBodyMetrics } from '@/features/bodyMetrics/useBodyMetrics'

export default function StatsPage() {
  const navigate = useNavigate()
  const { xp, level, currentStreak, longestStreak, streakFreezes, allAchievements } = useGamification()
  const { metrics } = useBodyMetrics(30)

  const xpNeeded = xpForLevel(level)
  const xpPercent = clampPercent(xp, xpNeeded)

  const chartData = [...metrics]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(m => ({ weight: m.weightKg }))

  const sortedAchievements = [
    ...allAchievements.filter(a => a.unlocked).sort((a, b) => (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0)),
    ...allAchievements.filter(a => !a.unlocked),
  ]

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
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-2 rounded-lg bg-muted flex-shrink-0">
                <Scale size={20} className="text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                {metrics[0] ? (
                  <>
                    <p className="text-lg font-bold">{metrics[0].weightKg} <span className="text-sm font-normal text-muted-foreground">kg</span></p>
                    <p className="text-xs text-muted-foreground">Latest weight</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Track your weight over time</p>
                )}
              </div>
            </div>
            {chartData.length > 1 && (
              <div className="w-20 h-10 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <YAxis domain={['auto', 'auto']} hide />
                    <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <Button variant="outline" size="sm" className="flex-shrink-0" onClick={() => navigate('/stats/weight')}>
              Open
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Achievements */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Achievements</h2>
        {sortedAchievements.length === 0 ? (
          <Card>
            <CardContent className="p-4 flex flex-col items-center gap-2 py-8">
              <Trophy size={32} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">
                No achievements defined yet
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {sortedAchievements.map(a => (
              <Card
                key={a.key}
                className={cn(
                  'transition-opacity',
                  a.unlocked ? 'border-yellow-500/40' : 'opacity-50'
                )}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <span className={cn('text-2xl', !a.unlocked && 'grayscale')}>{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-medium text-sm', !a.unlocked && 'text-muted-foreground')}>
                      {a.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                    {a.unlocked && a.unlockedAt && (
                      <p className="text-xs text-yellow-500/80 mt-0.5">
                        {format(new Date(a.unlockedAt), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                  {a.unlocked
                    ? <Trophy size={14} className="text-yellow-500 flex-shrink-0" />
                    : <Lock size={14} className="text-muted-foreground flex-shrink-0" />
                  }
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
