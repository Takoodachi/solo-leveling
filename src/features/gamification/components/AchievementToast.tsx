import { ChevronRight } from 'lucide-react'
import { achievementXp, type AchievementDef } from '../achievements'

/** An unlocked achievement's toast: the whole of it is a button that opens the achievement full screen. */
export default function AchievementToast({ def, goal, onOpen }: { def: AchievementDef; goal: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      // pointer-events-auto: an open dialog switches them off for everything outside it
      className="pointer-events-auto flex w-full items-center gap-3 rounded-lg border border-border bg-background p-4 text-left text-foreground shadow-lg"
    >
      <span className="text-2xl leading-none" aria-hidden="true">{def.icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{goal ? 'Goal reached' : 'Achievement unlocked'}: {def.title}</span>
        <span className="block text-xs text-muted-foreground">+{achievementXp(def)} XP · Tap to see it</span>
      </span>
      <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
    </button>
  )
}
