import { useState } from 'react'
import { useLocation } from 'react-router-dom'

// The tab last looked at on each page, until the app restarts
const lastTab = new Map<string, string>()

/**
 * Which tab of a long page is open. A link to one of the page's sections (`#id`, as search
 * results use) opens the tab that section is on, and so does `linked` (a page's own reason,
 * like `?lift=`); otherwise it's the tab last looked at. Picking a tab is not a navigation.
 */
export function usePageTab<T extends string>(
  page: string,
  tabs: readonly T[],
  /** Section id → the tab it's on. */
  sections: Record<string, T>,
  linked?: T,
): [T, (tab: T) => void] {
  const { key, hash } = useLocation()
  const [picked, setPicked] = useState<{ key: string; tab: T } | null>(null)
  const fromLink = sections[decodeURIComponent(hash.slice(1))] ?? linked
  const remembered = tabs.find(t => t === lastTab.get(page))
  // A pick only counts for the visit it was made on: arriving by another link starts from the link
  const tab = picked?.key === key ? picked.tab : fromLink ?? remembered ?? tabs[0]
  const pick = (next: T) => {
    lastTab.set(page, next)
    setPicked({ key, tab: next })
  }
  return [tab, pick]
}
