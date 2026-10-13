import type { HealthPrefs } from '@/types'
import { changeSettings } from '@/features/settings/hooks/useSettings'

/**
 * What the account remembers of the Android app's Samsung Health link (`settings.health`):
 * whether steps were kept syncing in the background. Access itself belongs to an install, and
 * Android forgets it when the app is removed; the account keeping a note is what lets a fresh
 * install ask for that again by itself (see `useHealthStepsSync`).
 *
 * No plugin is imported here, so this is safe to import anywhere (unlike `healthSteps`).
 */
export const rememberHealth = (now: HealthPrefs) =>
  changeSettings(s => {
    const keys = Object.keys(now) as (keyof HealthPrefs)[]
    return keys.every(k => s?.health?.[k] === now[k]) ? null : { health: { ...s?.health, ...now } }
  })

// (named when Health Connect's were the only questions asked this way)
const ASKED_KEY = 'solo:healthAsked'

/**
 * True the first time it is called for `what` on this install, false ever after: the app asks
 * by itself once and never nags. (Android stops showing a question after two refusals, so one
 * at every launch would also use up the chances to say yes from Settings.)
 */
export function firstAsk(what: 'notifications' | 'camera' | 'steps' | 'background'): boolean {
  try {
    const asked = (localStorage.getItem(ASKED_KEY) ?? '').split(',').filter(Boolean)
    if (asked.includes(what)) return false
    localStorage.setItem(ASKED_KEY, [...asked, what].join(','))
    return true
  } catch {
    return false // can't remember having asked: don't ask
  }
}
