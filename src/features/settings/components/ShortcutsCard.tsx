import { Link } from 'react-router-dom'
import { Target } from 'lucide-react'
import { NAV_CHOICES, NAV_ORDER, type NavTab } from '@/components/navTabs'
import { useNavTabs } from '@/hooks/useNavTabs'

const PAGES: NavTab[] = [
  ...NAV_ORDER.filter(id => id !== 'profile').map(id => NAV_CHOICES[id]),
  { to: '/challenges', label: 'Challenges', Icon: Target },
]

/** Profile: every page that isn't in the bottom bar, so none is ever out of reach. */
export default function ShortcutsCard() {
  const inBar = new Set(useNavTabs().map(t => t.to))
  const pages = PAGES.filter(p => !inBar.has(p.to))

  return (
    <div className="grid grid-cols-3 gap-2">
      {pages.map(p => (
        <Link key={p.to} to={p.to} className="flex flex-col items-center gap-1.5 rounded-2xl bg-card px-2 py-3.5 text-center transition-colors hover:bg-accent">
          <p.Icon size={20} className="text-primary" />
          <span className="text-xs font-medium">{p.label}</span>
        </Link>
      ))}
    </div>
  )
}
