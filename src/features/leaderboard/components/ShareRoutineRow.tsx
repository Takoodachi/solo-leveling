import { Link } from 'react-router-dom'
import { UsersRound } from 'lucide-react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import type { Routine } from '@/types'
import { useAuthStore } from '@/features/auth/authStore'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { saveRoutine } from '@/features/workouts/hooks/useRoutines'
import { isSharing } from '../api'

/** On your own routine: share it with friends, who find it under Workouts and can add it to theirs. */
export default function ShareRoutineRow({ routine }: { routine: Routine }) {
  const signedIn = useAuthStore(s => !!s.userId)
  const { settings } = useSettings()
  const onBoard = isSharing(settings)
  const shared = !!routine.shared

  async function share(on: boolean) {
    await saveRoutine({ ...routine, shared: on })
    if (on) toast.success(`Shared “${routine.name}” with friends`, { description: 'They’ll find it under Workouts → Need a template?' })
  }

  return (
    <div className="flex items-center gap-3 rounded-3xl bg-card p-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        <UsersRound size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">Share with friends</p>
        <p className="text-xs text-muted-foreground">
          {!signedIn ? (
            'Sign in to share it with friends.'
          ) : shared && !onBoard ? (
            <>Friends can’t see it while you’re off the leaderboard. <Link to="/settings#sharing" className="font-semibold text-primary">Turn sharing on</Link></>
          ) : shared ? (
            'Friends see it under Workouts and can add it to their routines.'
          ) : (
            'Let friends see it and add it to their routines.'
          )}
        </p>
      </div>
      <Switch checked={shared} disabled={!signedIn} onCheckedChange={v => void share(v)} aria-label="Share with friends" />
    </div>
  )
}
