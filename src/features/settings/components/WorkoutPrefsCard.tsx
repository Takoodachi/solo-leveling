import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useSettings } from '../hooks/useSettings'
import MusicAppSheet from '@/features/workouts/components/MusicAppSheet'
import { chooseMusicApp, musicApp, useMusicApp } from '@/features/workouts/music'

/** Settings → Workouts: the tips in the logger, the music app, and the way to the plan. */
export default function WorkoutPrefsCard() {
  const { settings, updateSettings } = useSettings()
  const musicId = useMusicApp(s => s.id)
  const music = musicApp(musicId)
  const [pickingMusic, setPickingMusic] = useState(false)

  return (
    <>
      <div className="flex items-center gap-3 rounded-3xl bg-card p-4">
        <div className="min-w-0 flex-1">
          <p className="font-medium">Tips during workouts</p>
          <p className="text-xs text-muted-foreground">
            What to try on each lift, from your last session: a rep more, or the next weight up.
          </p>
        </div>
        <Switch
          checked={settings?.workoutTips !== false}
          onCheckedChange={v => void updateSettings({ workoutTips: v })}
          aria-label="Show tips during workouts"
        />
      </div>
      <button type="button" onClick={() => setPickingMusic(true)} className="flex items-center gap-3 rounded-3xl bg-card p-4 text-left">
        <span className="min-w-0 flex-1">
          <span className="block font-medium">Music app</span>
          <span className="block text-xs text-muted-foreground">The music button on the workout screen opens it (on this device)</span>
        </span>
        <span className="shrink-0 text-sm text-muted-foreground">{music?.name ?? 'Choose'}</span>
        <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
      </button>
      <MusicAppSheet
        open={pickingMusic}
        onOpenChange={setPickingMusic}
        current={musicId}
        onPick={app => { chooseMusicApp(app.id); setPickingMusic(false) }}
      />
      <Link to="/workouts/plan" className="flex items-center gap-3 rounded-3xl bg-card p-4">
        <span className="min-w-0 flex-1">
          <span className="block font-medium">Your plan</span>
          <span className="block text-xs text-muted-foreground">Schedule, weekly goal and rest timer</span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
      </Link>
    </>
  )
}
