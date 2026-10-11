import { useRef, useState, type ChangeEvent } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useWallpaper } from '../hooks/useWallpaper'
import { LOOK_RANGE, removeWallpaper, saveWallpaper, saveWallpaperLook, wallpaperFromFile, type WallpaperLook } from '../wallpaper'

const SLIDERS: { key: keyof WallpaperLook; name: string; hint: string; step: number; shown: (n: number) => string }[] = [
  { key: 'dim', name: 'Dim', hint: 'How much of the theme covers the photo', step: 0.01, shown: n => `${Math.round(n * 100)}%` },
  { key: 'blur', name: 'Blur', hint: 'Softens a busy photo', step: 1, shown: n => (n === 0 ? 'Off' : `${n}`) },
]

/** Settings → Theme: a photo of your own behind the app, on this device. The app itself is the preview. */
export default function WallpaperCard() {
  const wallpaper = useWallpaper()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // picking the same file again still fires
    if (!file) return
    setBusy(true)
    try {
      await saveWallpaper(await wallpaperFromFile(file))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Couldn’t use that image')
    } finally {
      setBusy(false)
    }
  }

  if (!wallpaper) return null
  const { image, look } = wallpaper

  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-card p-4">
      <div className="px-1">
        <p className="eyebrow text-muted-foreground">Background photo</p>
        <p className="mt-1 text-xs text-muted-foreground">A picture of your own behind the app. It stays on this device.</p>
      </div>

      <div className="flex items-center gap-3">
        {image && <img src={image} alt="" className="h-20 w-14 shrink-0 rounded-xl object-cover" />}
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-secondary text-sm font-semibold hover:bg-accent disabled:opacity-60"
        >
          <ImagePlus size={16} /> {busy ? 'Preparing…' : image ? 'Change photo' : 'Choose a photo'}
        </button>
        {image && (
          <button
            type="button"
            onClick={() => void removeWallpaper()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-accent"
            aria-label="Remove the background photo"
          >
            <Trash2 size={16} />
          </button>
        )}
        <input ref={input} type="file" accept="image/*" className="hidden" onChange={e => void onFile(e)} />
      </div>

      {image && SLIDERS.map(s => (
        <label key={s.key} className="flex items-center gap-3 px-1">
          <span className="w-10 shrink-0 text-sm font-medium">{s.name}</span>
          <input
            type="range"
            className="h-11 min-w-0 flex-1 accent-primary"
            min={LOOK_RANGE[s.key][0]}
            max={LOOK_RANGE[s.key][1]}
            step={s.step}
            value={look[s.key]}
            onChange={e => void saveWallpaperLook({ ...look, [s.key]: Number(e.target.value) })}
            aria-label={`${s.name}: ${s.hint.toLowerCase()}`}
          />
          <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{s.shown(look[s.key])}</span>
        </label>
      ))}
    </div>
  )
}
