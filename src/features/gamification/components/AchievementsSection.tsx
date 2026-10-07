import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { ACHIEVEMENT_CATEGORIES } from '../achievements'
import { achievementGoalsFrom, toggleAchievementGoal } from '../goals'
import { useGamification, type AchievementView } from '../store'
import { useAchievementProgress } from '../useAchievementProgress'
import AchievementSheet from './AchievementSheet'
import AchievementTile from './AchievementTile'
import GoalCard from './GoalCard'

/** How many of the latest unlocked ones show before "Show all". */
const LATEST = 3

/**
 * Profile → Achievements. Closed, it's the goals being chased and the last few earned; "Show
 * all" opens every achievement by category with how far along each is. Tap one for its details
 * and to set it as a goal.
 */
export default function AchievementsSection() {
  const { allAchievements } = useGamification()
  const { settings } = useSettings()
  const [expanded, setExpanded] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const unlocked = allAchievements.filter(a => a.unlocked).sort((a, b) => (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0))
  const unlockedKeys = new Set(unlocked.map(a => a.key))
  const goals = achievementGoalsFrom(settings, unlockedKeys)
  const byKey = new Map(allAchievements.map(a => [a.key, a]))
  const pickedOne = picked ? byKey.get(picked) ?? null : null

  // Count only what's on screen: the goals, the one being looked at, and everything locked once it's all open
  const counted = expanded ? allAchievements.filter(a => !a.unlocked).map(a => a.key) : [...new Set([...goals, ...(pickedOne && !pickedOne.unlocked ? [pickedOne.key] : [])])]
  const progress = useAchievementProgress(counted)

  const open = (a: AchievementView) => { setPicked(a.key); setSheetOpen(true) }
  const tile = (a: AchievementView) => (
    <AchievementTile
      key={a.key}
      achievement={a}
      progress={!a.unlocked && progress?.[a.key] !== undefined ? Math.min(1, progress[a.key] / a.target) : undefined}
      isGoal={goals.includes(a.key)}
      onOpen={() => open(a)}
    />
  )

  return (
    <section id="achievements" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Achievements</h2>
        <span className="text-sm text-muted-foreground">{unlocked.length} / {allAchievements.length}</span>
      </div>

      {goals.map(key => {
        const a = byKey.get(key)
        return a && <GoalCard key={key} achievement={a} value={progress?.[key]} onOpen={() => open(a)} />
      })}

      {!expanded && (unlocked.length > 0
        ? <div className="grid grid-cols-3 gap-2.5">{unlocked.slice(0, LATEST).map(tile)}</div>
        : <p className="rounded-3xl bg-card p-5 text-sm text-muted-foreground">Nothing unlocked yet. Your first workout, meal or weigh-in earns one.</p>)}

      {expanded && ACHIEVEMENT_CATEGORIES.map(category => {
        const inCategory = allAchievements.filter(a => a.category === category.key)
        const earned = inCategory.filter(a => a.unlocked)
        return (
          <div key={category.key} className="flex flex-col gap-2">
            <p className="eyebrow flex justify-between px-1 text-muted-foreground">
              <span>{category.label}</span>
              <span>{earned.length} / {inCategory.length}</span>
            </p>
            <div className="grid grid-cols-3 gap-2.5">{[...earned, ...inCategory.filter(a => !a.unlocked)].map(tile)}</div>
          </div>
        )
      })}

      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-secondary text-sm font-semibold hover:bg-accent"
      >
        {expanded ? 'Show less' : `Show all ${allAchievements.length}`}
        <ChevronDown size={16} className={cn('transition-transform', expanded && 'rotate-180')} />
      </button>

      <AchievementSheet
        open={sheetOpen}
        achievement={pickedOne}
        value={pickedOne ? progress?.[pickedOne.key] : undefined}
        isGoal={!!pickedOne && goals.includes(pickedOne.key)}
        onToggleGoal={() => { if (pickedOne) void toggleAchievementGoal(pickedOne.key, unlockedKeys) }}
        onClose={() => setSheetOpen(false)}
      />
    </section>
  )
}
