import { Switch } from '@/components/ui/switch'
import { useAuthStore } from '@/features/auth/authStore'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { isSharing, leaderboardName, showsRoutines } from '../api'

/** Settings: the switch that puts you on (or takes you off) the friends leaderboard, and the one for your routines. */
export default function ShareCard() {
  const { settings, updateSettings } = useSettings()
  const signedIn = useAuthStore(s => !!s.userId)
  const email = useAuthStore(s => s.session?.user.email)
  if (!signedIn) return null

  const sharing = isSharing(settings)
  return (
    <div className="flex flex-col divide-y divide-foreground/5 rounded-3xl bg-card">
      <div className="flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="font-medium">Share on the leaderboard</p>
          <p className="text-xs text-muted-foreground">
            Friends see you as “{leaderboardName(settings, email)}”: photo, ranks, bodygraph, best lifts, level, streak and this week’s training.
            Never your food, weight or notes.
          </p>
        </div>
        <Switch checked={sharing} onCheckedChange={v => void updateSettings({ shareOnLeaderboard: v })} aria-label="Share on the leaderboard" />
      </div>
      <div className="flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="font-medium">Show my routines</p>
          <p className="text-xs text-muted-foreground">
            Your routines and weekly plan on your profile, without their notes, for friends to open and copy. Off, a link you shared opens nothing.
          </p>
        </div>
        <Switch checked={sharing && showsRoutines(settings)} disabled={!sharing} onCheckedChange={v => void updateSettings({ shareRoutines: v })} aria-label="Show my routines" />
      </div>
    </div>
  )
}
