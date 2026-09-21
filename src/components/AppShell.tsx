import { Suspense, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import BottomNav from './BottomNav'

const TAB_ORDER = ['/home', '/workouts', '/nutrition', '/analytics', '/profile']

function getTabIndex(pathname: string) {
  const i = TAB_ORDER.findIndex(t => pathname.startsWith(t))
  return i === -1 ? 0 : i
}

const slideVariants = {
  initial: (dir: number) => ({ x: `${dir * 24}%`, opacity: 0 }),
  animate: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: `${dir * -24}%`, opacity: 0 }),
}

export default function AppShell() {
  const location = useLocation()
  const currentIdx = getTabIndex(location.pathname)

  // Slide direction comes from the previous tab (React's "store info from previous renders" pattern).
  const [nav, setNav] = useState({ idx: currentIdx, dir: 1 })
  if (nav.idx !== currentIdx) setNav({ idx: currentIdx, dir: currentIdx >= nav.idx ? 1 : -1 })
  const dir = nav.idx !== currentIdx ? (currentIdx >= nav.idx ? 1 : -1) : nav.dir

  // Key on the full path so each screen gets a fresh scroll position.
  const key = location.pathname

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <main className="relative flex-1 overflow-hidden">
        <AnimatePresence initial={false} mode="wait" custom={dir}>
          <motion.div
            key={key}
            custom={dir}
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: 'tween', duration: 0.18, ease: 'easeOut' }}
            className="absolute inset-0 overflow-y-auto overscroll-contain pt-safe pl-safe pr-safe"
          >
            {/* Bottom padding clears the nav bar (4rem) + home indicator. */}
            <div className="mx-auto w-full max-w-md px-4 pb-[calc(env(safe-area-inset-bottom)+6rem)]">
              <Suspense fallback={null}>
                <Outlet />
              </Suspense>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav />
    </div>
  )
}
