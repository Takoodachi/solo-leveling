import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNavTabs } from '@/hooks/useNavTabs'
import type { NavTab } from './navTabs'
import QuickAddSheet from './QuickAddSheet'

function Tab({ to, label, Icon }: NavTab) {
  return (
    <NavLink
      to={to}
      aria-label={label}
      className={({ isActive }) =>
        cn(
          'relative flex h-full flex-col items-center justify-center gap-1 transition-colors',
          isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute top-0 h-[3px] w-8 rounded-b-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]" />}
          <Icon size={24} strokeWidth={isActive ? 2.4 : 1.8} className={cn(isActive && 'drop-shadow-[0_0_10px_hsl(var(--primary)/0.55)]')} />
          <span className={cn('text-[11px] font-medium leading-none', !isActive && 'sr-only')}>{label}</span>
        </>
      )}
    </NavLink>
  )
}

export default function BottomNav() {
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  // Home · chosen · (+) · chosen · Settings (the middle two are picked in Settings)
  const tabs = useNavTabs()

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-foreground/5 bg-background/85 pb-safe backdrop-blur-xl">
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-2">
          <Tab {...tabs[0]} />
          <Tab {...tabs[1]} />
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setQuickAddOpen(true)}
              aria-label="Quick add"
              className="-translate-y-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-background shadow-xl shadow-black/25 dark:shadow-black/60 transition-transform active:scale-95"
            >
              <Plus size={28} strokeWidth={2.2} />
            </button>
          </div>
          <Tab {...tabs[2]} />
          <Tab {...tabs[3]} />
        </div>
      </nav>
      <QuickAddSheet open={quickAddOpen} onOpenChange={setQuickAddOpen} />
    </>
  )
}
