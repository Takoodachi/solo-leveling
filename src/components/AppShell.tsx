import { Suspense, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import BottomNav from './BottomNav'

const TAB_ORDER = ['/home', '/workouts', '/nutrition', '/analytics', '/profile']

function getTabIndex(pathname: string) {
  const i = TAB_ORDER.findIndex(t => pathname.startsWith(t))
  return i === -1 ? 0 : i
}

/**
 * Tab screens scroll the document itself (no fixed-height inner scroller): iOS
 * Safari then sizes the viewport correctly, can collapse its toolbars, and never
 * leaves the bottom nav hidden behind them.
 */
export default function AppShell() {
  const location = useLocation()
  const currentIdx = getTabIndex(location.pathname)

  // Slide direction comes from the previous tab (React's "store info from previous renders" pattern).
  const [nav, setNav] = useState({ idx: currentIdx, dir: 1 })
  if (nav.idx !== currentIdx) setNav({ idx: currentIdx, dir: currentIdx >= nav.idx ? 1 : -1 })
  const dir = nav.idx !== currentIdx ? (currentIdx >= nav.idx ? 1 : -1) : nav.dir

  return (
    <div className="min-h-dvh overflow-x-clip bg-background text-foreground">
      <motion.main
        key={location.pathname}
        initial={{ x: `${dir * 24}%`, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'tween', duration: 0.18, ease: 'easeOut' }}
        className="pt-safe pl-safe pr-safe"
      >
        {/* Bottom padding clears the nav bar (4rem) + home indicator. */}
        <div className="mx-auto w-full max-w-md px-4 pb-[calc(env(safe-area-inset-bottom)+6rem)]">
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </div>
      </motion.main>
      <BottomNav />
    </div>
  )
}
