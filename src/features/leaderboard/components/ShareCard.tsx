import { Switch } from '@/components/ui/switch'
import { useAuthStore } from '@/features/auth/authStore'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { isSharing, leaderboardName } from '../api'

/** Profile: the switch that puts you on (or takes you off) the friends leaderboard. */
export default function ShareCard() {
  const { settings, updateSettings } = useSettings()
  const signedIn = useAuthStore(s => !!s.userId)
  const email = useAuthStore(s => s.session?.user.email)
  if (!signedIn) return null

  return (
    <div className="flex items-center gap-3 rounded-3xl bg-card p-4">
      <div className="min-w-0 flex-1">
        <p className="font-medium">Share on the leaderboard</p>
        <p className="text-xs text-muted-foreground">
          Friends see you as “{leaderboardName(settings, email)}”: ranks, bodygraph, best lifts, level, streak and this week’s training.
          Never your food, weight or notes.
        </p>
      </div>
      <Switch
        checked={isSharing(settings)}
        onCheckedChange={v => void updateSettings({ shareOnLeaderboard: v })}
        aria-label="Share on the leaderboard"
      />
    </div>
  )
}
