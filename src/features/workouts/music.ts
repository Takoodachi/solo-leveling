import { create } from 'zustand'
import { toast } from 'sonner'
import { isAndroidApp, openAndroidApp, soloHas } from '@/lib/native'

/**
 * The workout screen's music button (November 2026): one tap to the user's own music app, to change
 * what's playing without going through Home. The Android app opens it by its package, back where it
 * was left (`SoloPlugin.openApp`), or, from an APK without that, by its web address, which Android
 * hands to the installed app; an iPhone uses the app's own link (`spotify://`…); a browser opens the
 * web player. Which app is chosen per device (`solo:musicApp`): phone and laptop may differ.
 */
export interface MusicApp {
  id: string
  name: string
  /** Its Android package; '' = the phone's default music player. Opening by package needs the APK's `openApp`. */
  android?: string
  /** Its iPhone app link (Spotify's, Apple Music's and Pandora's are documented; the rest fall back to the web player). */
  ios?: string
  /** The web player; on Android the installed app takes this link. */
  web?: string
}

export const MUSIC_APPS: MusicApp[] = [
  { id: 'youtube-music', name: 'YouTube Music', android: 'com.google.android.apps.youtube.music', ios: 'youtubemusic://', web: 'https://music.youtube.com/' },
  { id: 'spotify', name: 'Spotify', android: 'com.spotify.music', ios: 'spotify://', web: 'https://open.spotify.com/' },
  { id: 'apple-music', name: 'Apple Music', android: 'com.apple.android.music', ios: 'music://', web: 'https://music.apple.com/' },
  { id: 'amazon-music', name: 'Amazon Music', android: 'com.amazon.mp3', ios: 'amznmp3://', web: 'https://music.amazon.com/' },
  { id: 'soundcloud', name: 'SoundCloud', android: 'com.soundcloud.android', ios: 'soundcloud://', web: 'https://soundcloud.com/' },
  { id: 'pandora', name: 'Pandora', android: 'com.pandora.android', ios: 'pandora://', web: 'https://www.pandora.com/' },
  { id: 'deezer', name: 'Deezer', android: 'deezer.android.app', ios: 'deezer://', web: 'https://www.deezer.com/' },
  { id: 'tidal', name: 'TIDAL', android: 'com.aspiro.tidal', ios: 'tidal://', web: 'https://listen.tidal.com/' },
  { id: 'samsung-music', name: 'Samsung Music', android: 'com.sec.android.app.music' },
  { id: 'default', name: 'My phone’s music player', android: '' },
]

const isApple = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

/** The apps that can be opened from here: by package (or web address) in the Android app, by app link on an iPhone, as a web player elsewhere. */
export function musicAppsHere(): MusicApp[] {
  if (isAndroidApp()) return MUSIC_APPS.filter(a => a.android !== undefined && (soloHas('openApp') || a.web))
  if (isApple()) return MUSIC_APPS.filter(a => a.ios)
  return MUSIC_APPS.filter(a => a.web)
}

const KEY = 'solo:musicApp'
function saved(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

/** The music app chosen on this device (its id). */
export const useMusicApp = create<{ id: string | null }>(() => ({ id: saved() }))

export function chooseMusicApp(id: string): void {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    // storage unavailable: asked again next time
  }
  useMusicApp.setState({ id })
}

export const musicApp = (id: string | null): MusicApp | undefined => musicAppsHere().find(a => a.id === id)

export async function openMusicApp(app: MusicApp): Promise<void> {
  if (isAndroidApp()) {
    if (app.android !== undefined && (await openAndroidApp(app.android))) return
    // Android hands the web address to the installed app, or to the browser without one
    if (app.web) location.href = app.web
    else toast.error(`Couldn’t find ${app.name} on this phone`)
    return
  }
  if (isApple() && app.ios) {
    location.href = app.ios
    // A link no installed app answers leaves the page in front: offer the web player (a tap, so it isn't blocked)
    setTimeout(() => {
      const web = app.web
      if (document.visibilityState === 'visible' && web) toast(`${app.name} didn’t open`, { action: { label: 'Web player', onClick: () => window.open(web, '_blank') } })
    }, 1500)
    return
  }
  if (app.web) window.open(app.web, '_blank', 'noopener')
}
