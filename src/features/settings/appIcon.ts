import { useEffect } from 'react'
import { setAppIcon } from '@/lib/native'
import { useSettings } from './hooks/useSettings'
import { parseHsl } from './themeBuilder'
import { THEMES, resolveTheme, type Theme } from './themes'

/**
 * The Android app's icon follows the theme (November 2026, at the owner's request): each preset
 * has an icon in its colours and a launcher entry of its own (scripts/generate-theme-icons.mjs,
 * AppIcons.kt), and the user's own theme takes the preset whose accent is nearest in hue, of the
 * same lightness. Switching drops the home-screen icon on many launchers; see AppIcons.kt.
 */

/** A theme's launcher entry. Must match alias() in scripts/generate-theme-icons.mjs. */
export const iconAlias = (themeId: string) => `Icon${themeId[0].toUpperCase()}${themeId.slice(1)}`

const hue = (t: Theme) => parseHsl(t.vars.primary)?.[0] ?? 0

/** The preset whose icon a theme gets: itself, or for a custom one the nearest preset. */
export function iconTheme(theme: Theme): Theme {
  if (THEMES.some(t => t.id === theme.id)) return theme
  const apart = (t: Theme) => { const d = Math.abs(hue(t) - hue(theme)) % 360; return Math.min(d, 360 - d) }
  return THEMES.filter(t => t.mode === theme.mode).reduce((best, t) => (apart(t) < apart(best) ? t : best))
}

const ASKED_KEY = 'solo:appIcon'

/** Mount once (App): asks for the theme's icon whenever the saved theme changes, once the account's settings are in. */
export function useAppIconSync(ready: boolean): void {
  const { settings } = useSettings()
  const alias = ready && settings ? iconAlias(iconTheme(resolveTheme(settings.theme, settings.customTheme)).id) : null
  useEffect(() => {
    if (!alias) return
    let asked: string | null = null
    try {
      asked = localStorage.getItem(ASKED_KEY)
    } catch {
      // storage unavailable: ask again, which changes nothing when it's on already
    }
    if (asked === alias) return
    void setAppIcon(alias).then(ok => {
      if (!ok) return
      try {
        localStorage.setItem(ASKED_KEY, alias)
      } catch {
        // asked again next launch
      }
    })
  }, [alias])
}
