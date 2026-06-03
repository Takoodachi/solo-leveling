import { useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import BottomNav from './BottomNav'

const TAB_ORDER = ['/dashboard', '/nutrition', '/stats', '/settings']

function getTabIndex(pathname: string) {
  const i = TAB_ORDER.findIndex(t => pathname.startsWith(t))
  return i === -1 ? 0 : i
}

const slideVariants = {
  initial: (dir: number) => ({ x: `${dir * 100}%`, opacity: 0 }),
  animate: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: `${dir * -100}%`, opacity: 0 }),
}

export default function AppShell() {
  const location = useLocation()
  const currentIdx = getTabIndex(location.pathname)
  const prevIdxRef = useRef(currentIdx)

  const dir = currentIdx >= prevIdxRef.current ? 1 : -1
  prevIdxRef.current = currentIdx

  // Key on the top-level path segment so sub-routes don't trigger a slide
  const topSegment = location.pathname.split('/')[1] ?? 'dashboard'

  return (
    <div className="flex flex-col h-dvh bg-background text-foreground overflow-hidden">
      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence initial={false} mode="wait" custom={dir}>
          <motion.div
            key={topSegment}
            custom={dir}
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: 'tween', duration: 0.22, ease: 'easeInOut' }}
            className="absolute inset-0 overflow-y-auto pb-16"
          >
            <div className="w-full max-w-md mx-auto">
              <Outlet />
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav />
    </div>
  )
}
