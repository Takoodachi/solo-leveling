import { useCallback, useState, type ReactNode } from 'react'
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { hasMediaKeys, musicPlaying, sendMediaKey, type MediaKey } from '@/lib/native'
import { useRefreshOnReturn } from '@/hooks/useRefreshOnReturn'
import { cn } from '@/lib/utils'
import { musicApp, openMusicApp, useMusicApp } from '../music'

/**
 * Previous / play-pause / next for whatever is playing, under the workout screen's header or, as a
 * floating bar, at its bottom (workoutLayout.ts): the Android app (an APK with `mediaKey`), once a
 * music app is chosen. They're the media buttons headphones send, so they work with any player
 * without leaving the workout.
 */
export default function MusicControls({ floating = false }: { floating?: boolean }) {
  const app = musicApp(useMusicApp(s => s.id))
  const [playing, setPlaying] = useState<boolean | null>(null)
  // Read when shown, on coming back to the app, and after a press (a streaming player can take a second or two)
  const refresh = useCallback(() => musicPlaying().then(setPlaying), [])
  useRefreshOnReturn(refresh)

  if (!app || !hasMediaKeys()) return null

  function press(key: MediaKey) {
    sendMediaKey(key)
    for (const ms of [700, 2000]) setTimeout(() => void refresh(), ms)
  }

  return (
    <div
      className={cn(
        'mx-auto flex max-w-md items-center gap-1',
        floating ? 'pointer-events-auto w-full rounded-3xl border border-foreground/10 bg-popover/95 px-3 shadow-2xl backdrop-blur-xl' : 'px-4 pb-1',
      )}
    >
      <button type="button" onClick={() => void openMusicApp(app)} className="min-w-0 flex-1 truncate py-2 text-left text-xs text-muted-foreground">
        {app.name}
      </button>
      <Key label="Previous track" onClick={() => press('previous')}><SkipBack size={18} /></Key>
      <Key label={playing ? 'Pause music' : 'Play music'} onClick={() => press('playPause')}>
        {playing ? <Pause size={20} /> : <Play size={20} />}
      </Key>
      <Key label="Next track" onClick={() => press('next')}><SkipForward size={18} /></Key>
    </div>
  )
}

function Key({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-accent active:bg-accent">
      {children}
    </button>
  )
}
