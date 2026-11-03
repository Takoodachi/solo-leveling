import { useState } from 'react'
import { Music2 } from 'lucide-react'
import MusicAppSheet from './MusicAppSheet'
import { chooseMusicApp, musicApp, openMusicApp, useMusicApp } from '../music'

/** The workout screen's way to the music: opens the music app chosen on this device, asking which the first time. */
export default function MusicButton() {
  const id = useMusicApp(s => s.id)
  const app = musicApp(id)
  const [picking, setPicking] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => (app ? void openMusicApp(app) : setPicking(true))}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
        aria-label={app ? `Open ${app.name}` : 'Choose your music app'}
      >
        <Music2 size={20} />
      </button>
      <MusicAppSheet
        open={picking}
        onOpenChange={setPicking}
        current={id}
        onPick={picked => {
          chooseMusicApp(picked.id)
          setPicking(false)
          void openMusicApp(picked)
        }}
      />
    </>
  )
}
