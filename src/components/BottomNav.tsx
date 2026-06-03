import { NavLink } from 'react-router-dom'
import { Home, Apple, BarChart2, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/dashboard',  label: 'Home',      Icon: Home      },
  { to: '/nutrition',  label: 'Nutrition', Icon: Apple     },
  { to: '/stats',      label: 'Stats',     Icon: BarChart2 },
  { to: '/settings',   label: 'Settings',  Icon: Settings  },
] as const

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 border-t border-border flex items-center justify-around z-50">
      {tabs.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'relative flex flex-col items-center gap-0.5 py-2 px-4 text-[11px] transition-colors min-w-[48px]',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute -top-px h-1 w-8 rounded-b-full bg-primary" />
              )}
              <Icon size={22} className={cn('transition-transform', isActive && 'scale-110')} />
              <span className={cn(isActive && 'font-medium')}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
