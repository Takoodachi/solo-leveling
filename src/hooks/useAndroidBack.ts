import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { leaveApp, onAndroidBack } from '@/lib/native'

/** Screens on the bottom bar's level: Back from one goes Home, not back through every tab visited. */
const TOP_LEVEL = new Set(['/workouts', '/nutrition', '/analytics', '/profile', '/settings', '/ranks', '/leaderboard'])
/** Sent to the window on each Back, before anything else: cancel it to say "that was mine". */
const BACK_EVENT = 'solo:back'
/** What Radix puts on screen that Escape closes: dialogs, sheets, menus, select lists. */
const DISMISSIBLE = '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]'

/** While `open`, Android's Back calls `close` instead of leaving the screen. */
export function useCloseOnBack(open: boolean, close: () => void): void {
  const latest = useRef(close)
  useEffect(() => {
    latest.current = close
  }, [close])
  useEffect(() => {
    if (!open) return
    const onBack = (event: Event) => {
      event.preventDefault()
      latest.current()
    }
    window.addEventListener(BACK_EVENT, onBack)
    return () => window.removeEventListener(BACK_EVENT, onBack)
  }, [open])
}

/**
 * Mount once, inside the router. Android app: the system's Back (the edge swipe or the button)
 * works inside the app instead of closing it. In order: whatever asked to close first
 * (`useCloseOnBack`), then an open dialog, sheet or menu, then one screen back: Home from a
 * bottom-bar screen, the previous screen from a deeper one, and out of the app from Home.
 */
export function useAndroidBack(): void {
  const navigate = useNavigate()
  const location = useLocation()
  const at = useRef(location)
  useEffect(() => {
    at.current = location
  }, [location])

  useEffect(() => onAndroidBack(() => {
    if (!window.dispatchEvent(new Event(BACK_EVENT, { cancelable: true }))) return
    if (document.querySelector(DISMISSIBLE)) {
      // The same Escape that closes it from a keyboard
      const target = document.activeElement ?? document.body
      target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }))
      return
    }
    const { pathname, key } = at.current
    if (pathname === '/home') leaveApp()
    // `default` = the screen the app was opened on (a shortcut, a notification): nothing behind it
    else if (TOP_LEVEL.has(pathname) || key === 'default') navigate('/home', { replace: true })
    else navigate(-1)
  }), [navigate])
}
