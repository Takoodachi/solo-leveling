import { BicepsFlexed, CalendarCheck, ChartColumn, Dumbbell, Footprints, GlassWater, Scale, Trophy, Utensils, type LucideIcon } from 'lucide-react'
import type { AppShortcutId, Settings } from '@/types'

/**
 * What a long-press on the Android app's icon offers (Settings → App icon). The app publishes
 * the chosen ones as dynamic shortcuts (android/…/Shortcuts.kt); each opens the app at `path`.
 * A new one also needs its icon: res/drawable/ic_shortcut_<id>.xml (scripts/generate-shortcut-icons.mjs).
 */
export interface AppShortcut {
  label: string
  path: string
  Icon: LucideIcon
}

export const APP_SHORTCUTS: Record<AppShortcutId, AppShortcut> = {
  workout: { label: 'Start workout', path: '/workouts?start=1', Icon: Dumbbell },
  food: { label: 'Log food', path: '/nutrition?add=1', Icon: Utensils },
  weight: { label: 'Log weight', path: '/analytics/weight', Icon: Scale },
  water: { label: 'Log water', path: '/home?log=water', Icon: GlassWater },
  steps: { label: 'Log steps', path: '/home?log=steps', Icon: Footprints },
  recap: { label: 'Recap', path: '/recap', Icon: CalendarCheck },
  ranks: { label: 'Strength ranks', path: '/ranks', Icon: BicepsFlexed },
  leaderboard: { label: 'Leaderboard', path: '/leaderboard', Icon: Trophy },
  analytics: { label: 'Analytics', path: '/analytics', Icon: ChartColumn },
}
export const APP_SHORTCUT_ORDER = Object.keys(APP_SHORTCUTS) as AppShortcutId[]
export const DEFAULT_APP_SHORTCUTS: AppShortcutId[] = ['workout', 'food', 'weight']
/** Launchers show about four. */
export const MAX_APP_SHORTCUTS = 4

/** The chosen shortcuts in order; the original three until something is chosen (an empty choice stays empty). */
export function appShortcutsFrom(settings: Settings | undefined): AppShortcutId[] {
  const saved = settings?.appShortcuts
  if (!Array.isArray(saved)) return DEFAULT_APP_SHORTCUTS
  return [...new Set(saved.filter(id => id in APP_SHORTCUTS))].slice(0, MAX_APP_SHORTCUTS)
}
