import { Suspense, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useCameBack } from '@/hooks/useEnterAnimation'
import { useNavTabs } from '@/hooks/useNavTabs'
import { cn } from '@/lib/utils'
import BottomNav from './BottomNav'

/** Position for the slide direction: bar tabs in bar order, other pages just past them. */
function getTabIndex(order: string[], pathname: string) {
  const i = order.findIndex(t => pathname.startsWith(t))
  return i === -1 ? order.length : i
}

/**
 * Tab screens scroll the document itself (no fixed-height inner scroller): iOS
 * Safari then sizes the viewport correctly, can collapse its toolbars, and never
 * leaves the bottom nav hidden behind them.
 */
export default function AppShell() {
  const location = useLocation()
  const tabs = useNavTabs()
  const currentIdx = getTabIndex(tabs.map(t => t.to), location.pathname)

  // Slide direction comes from the previous tab (React's "store info from previous renders" pattern).
  const [nav, setNav] = useState({ idx: currentIdx, dir: 1 })
  if (nav.idx !== currentIdx) setNav({ idx: currentIdx, dir: currentIdx >= nav.idx ? 1 : -1 })
  // Back always comes in from the left, whichever tab it lands on
  const back = useCameBack()
  const dir = back ? -1 : nav.idx !== currentIdx ? (currentIdx >= nav.idx ? 1 : -1) : nav.dir

  return (
    <div className="min-h-dvh overflow-x-clip bg-page text-foreground">
      {/* A new screen slides in from the side its tab is on (the key restarts the animation).
          The boundary is outside it on purpose: a screen whose code isn't here yet then keeps
          the one on show where it is (a navigation is a transition) and arrives with its
          animation. Inside, the slide played on an empty screen and the content turned up after it. */}
      <Suspense fallback={null}>
        <main
          key={location.pathname}
          className={cn('pt-safe pl-safe pr-safe duration-200 ease-out animate-in fade-in-0', dir > 0 ? 'slide-in-from-right-[24%]' : 'slide-in-from-left-[24%]')}
        >
          {/* Bottom padding clears the nav bar (4rem) + home indicator. */}
          <div className="mx-auto w-full max-w-md px-4 pb-[calc(env(safe-area-inset-bottom)+6rem)]">
            <Outlet />
          </div>
        </main>
      </Suspense>
      <BottomNav />
    </div>
  )
}
