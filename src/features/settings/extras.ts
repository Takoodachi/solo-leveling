import { useEffect } from 'react'
import type { ExtraKey, Extras } from '@/types'
import { isAndroidApp } from '@/lib/native'
import { useSettings } from './hooks/useSettings'

/**
 * Things the app does by itself that can each be switched off (Settings → Extras; November 2026,
 * at the owner's request): `settings.extras`, synced, where false is off and a missing key is on,
 * so nothing changes for anyone until they switch something.
 */
export interface Extra {
  key: ExtraKey
  label: string
  description: string
  /** More words that should find it in the search (Settings and Home). */
  keywords: string
  /** Only where it can happen: the Android app, or with an account on the leaderboard. */
  only?: 'android' | 'signedIn'
}

export const EXTRAS: Extra[] = [
  { key: 'checkIn', label: 'Weekly targets check-in', description: 'On Mondays, new daily targets from what you ate and weighed, to apply or keep', keywords: 'weekly recalculate recalculation adjust update calories macros monday popup card suggestion maintenance' },
  { key: 'recapBanner', label: 'Weekly recap on Home', description: 'Last week in review, on Home from Monday until you open it', keywords: 'weekly recap summary review banner monday last week popup card' },
  { key: 'caffeine', label: 'Caffeine warning', description: 'A note when today’s food passes 400 mg of caffeine', keywords: 'coffee energy drink tea warning alert message popup' },
  { key: 'highFives', label: 'High-five notices', description: 'A note when friends high-five your bests', keywords: 'high five friends leaderboard notice message popup alert social', only: 'signedIn' },
  { key: 'rankUps', label: 'Rank-up sequence', description: 'The full-screen show after a workout that moved a rank', keywords: 'rank animation celebration ceremony fullscreen show finish workout level effects' },
  { key: 'haptics', label: 'Vibration', description: 'A tick when you check off a set, a buzz when rest is over', keywords: 'vibrate vibrating vibration haptic haptics buzz buzzing shake feel tick' },
  { key: 'workoutNotice', label: 'Workout notification', description: 'What’s next and the rest timer on the lock screen while you train', keywords: 'notification notifications lock screen ongoing status bar rest timer workout', only: 'android' },
]

/** The ones that can happen here: the Android app's only there, the leaderboard's only with an account. */
export const extrasHere = (signedIn: boolean): Extra[] =>
  EXTRAS.filter(x => (x.only !== 'android' || isAndroidApp()) && (x.only !== 'signedIn' || signedIn))

let current: Extras | undefined

/** Whether it's on: in the settings given, else in the ones the app read last (for code outside React). */
export function extraOn(key: ExtraKey, extras: Extras | undefined = current): boolean {
  return extras?.[key] !== false
}

/** Mount once (App): keeps what code outside React reads (vibration, the rank-up check) in step. */
export function useExtrasCache(): void {
  const { settings } = useSettings()
  useEffect(() => {
    current = settings?.extras
  }, [settings?.extras])
}
