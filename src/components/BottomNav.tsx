import { NavLink } from 'react-router-dom'
import { Home, Dumbbell, Apple, BarChart2, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/dashboard',  label: 'Home',      Icon: Home      },
  { to: '/workouts',   label: 'Workouts',  Icon: Dumbbell  },
  { to: '/nutrition',  label: 'Nutrition', Icon: Apple     },
  { to: '/stats',      label: 'Stats',     Icon: BarChart2 },
  { to: '/settings',   label: 'Settings',  Icon: Settings  },
] as const

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-border flex items-center justify-around z-50">
      {tabs.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-0.5 py-2 px-4 text-xs transition-colors min-w-[48px]',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )
          }
        >
          <Icon size={22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
