import { useEffect } from 'react'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { HOME_TAB, NAV_CHOICES, SETTINGS_TAB, navTabsFrom, type NavTab } from '@/components/navTabs'
import type { NavTabId } from '@/types'

const CACHE_KEY = 'solo:navTabs'

function cached(): NavTabId[] | undefined {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as NavTabId[]) : undefined
  } catch {
    return undefined
  }
}

/**
 * The bottom bar, left to right: Home, the two chosen pages, Settings. Until
 * settings load, this device's last bar is used so launches don't flicker.
 */
export function useNavTabs(): NavTab[] {
  const { settings } = useSettings()
  const [a, b] = navTabsFrom(settings ?? { id: 1, navTabs: cached() })
  const key = `${a},${b}`
  useEffect(() => {
    if (!settings) return
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(key.split(',')))
    } catch {
      // storage unavailable: the synced setting still applies after load
    }
  }, [settings, key])
  return [HOME_TAB, NAV_CHOICES[a], NAV_CHOICES[b], SETTINGS_TAB]
}

/** Whether a page is in the bottom bar right now (tab pages drop their back button). */
export function useIsNavTab(path: string): boolean {
  return useNavTabs().some(t => t.to === path)
}
