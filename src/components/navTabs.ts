import { BarChart3, BicepsFlexed, Dumbbell, Home, Settings as Gear, Trophy, UserRound, UtensilsCrossed, type LucideIcon } from 'lucide-react'
import type { NavTabId, Settings } from '@/types'

export interface NavTab {
  to: string
  label: string
  Icon: LucideIcon
}

/** Pages the two middle slots of the bottom bar can hold (Home and Settings are fixed). */
export const NAV_CHOICES: Record<NavTabId, NavTab> = {
  workouts:    { to: '/workouts',    label: 'Workouts',    Icon: Dumbbell },
  nutrition:   { to: '/nutrition',   label: 'Nutrition',   Icon: UtensilsCrossed },
  analytics:   { to: '/analytics',   label: 'Analytics',   Icon: BarChart3 },
  strength:    { to: '/ranks',       label: 'Strength',    Icon: BicepsFlexed },
  leaderboard: { to: '/leaderboard', label: 'Leaderboard', Icon: Trophy },
  profile:     { to: '/profile',     label: 'Profile',     Icon: UserRound },
}
export const NAV_ORDER = Object.keys(NAV_CHOICES) as NavTabId[]
export const HOME_TAB: NavTab = { to: '/home', label: 'Home', Icon: Home }
export const SETTINGS_TAB: NavTab = { to: '/settings', label: 'Settings', Icon: Gear }
export const DEFAULT_NAV_TABS: [NavTabId, NavTabId] = ['workouts', 'analytics']

/** The two chosen slots: saved choices first, gaps filled from the defaults, never the same page twice. */
export function navTabsFrom(settings: Settings | undefined): [NavTabId, NavTabId] {
  const picked = (settings?.navTabs ?? []).filter(id => id in NAV_CHOICES)
  const ids = [...new Set([...picked, ...DEFAULT_NAV_TABS, ...NAV_ORDER])]
  return [ids[0], ids[1]]
}
