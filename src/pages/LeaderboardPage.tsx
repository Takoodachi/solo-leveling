import { useState } from 'react'
import { Link } from 'react-router-dom'
import { startOfWeek } from 'date-fns'
import { EyeOff, RefreshCw, Users } from 'lucide-react'
import FullScreen from '@/components/FullScreen'
import PageHeader from '@/components/PageHeader'
import Segmented from '@/components/Segmented'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toDateStr } from '@/lib/date'
import { useNow } from '@/hooks/useNow'
import { updateSettings } from '@/features/settings/hooks/useSettings'
import { useLeaderboard } from '@/features/leaderboard/useLeaderboard'
import { BOARDS, type BoardKey } from '@/features/leaderboard/boards'
import Standings from '@/features/leaderboard/components/Standings'
import MuscleCrowns from '@/features/leaderboard/components/MuscleCrowns'
import Highlights from '@/features/leaderboard/components/Highlights'

const BOARD_OPTIONS = BOARDS.map(b => ({ value: b.key, label: b.label }))

export default function LeaderboardPage() {
  const now = useNow()
  const weekStart = toDateStr(startOfWeek(now, { weekStartsOn: 1 }))
  const [board, setBoard] = useState<BoardKey>('strength')
  const lb = useLeaderboard()
  const friends = lb.entries.filter(e => !e.me).length

  const refresh = (
    <button
      type="button"
      onClick={() => void lb.refresh()}
      className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
      aria-label="Refresh"
    >
      <RefreshCw size={20} className={cn(lb.loading && 'animate-spin')} />
    </button>
  )

  return (
    <FullScreen className="flex flex-col gap-6">
      <PageHeader back="/profile" title="Leaderboard" action={lb.signedIn ? refresh : undefined} />

      {!lb.signedIn ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-card p-6 text-center">
          <Users size={32} className="text-primary" />
          <p className="font-semibold">Compare with friends</p>
          <p className="text-sm text-muted-foreground">The leaderboard needs an account. Sign in to see your friends’ ranks, bodygraphs and weeks.</p>
          <Button asChild className="mt-1"><Link to="/login">Sign in</Link></Button>
        </div>
      ) : (
        <>
          {!lb.sharing && (
            <div className="flex items-center gap-3 rounded-3xl bg-card p-4">
              <EyeOff size={20} className="shrink-0 text-muted-foreground" />
              <p className="min-w-0 flex-1 text-sm text-muted-foreground">You’re hidden, so friends can’t see you here.</p>
              <Button size="sm" onClick={() => void updateSettings({ shareOnLeaderboard: true })}>Share</Button>
            </div>
          )}

          <Segmented size="sm" value={board} options={BOARD_OPTIONS} onChange={setBoard} />
          <Standings entries={lb.entries} board={board} weekStart={weekStart} />
          {lb.ready && friends === 0 && (
            <p className="-mt-3 px-2 text-center text-xs text-muted-foreground">
              No friends here yet. Everyone with an account shows up after they next open the app.
            </p>
          )}
          {lb.error && !lb.rows && <p className="-mt-3 px-2 text-center text-xs text-destructive">Couldn’t load the leaderboard: {lb.error}</p>}

          <section className="flex flex-col gap-3">
            <div>
              <h2 className="text-lg font-semibold">Muscle crowns</h2>
              <p className="text-sm text-muted-foreground">The highest rank in each muscle group holds the crown.</p>
            </div>
            <MuscleCrowns entries={lb.entries} />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Recent highlights</h2>
            <Highlights entries={lb.entries} />
          </section>
        </>
      )}
    </FullScreen>
  )
}
