import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HOME_TAB, NAV_CHOICES, NAV_ORDER, SETTINGS_TAB, navTabsFrom, type NavTab } from '@/components/navTabs'
import type { NavTabId } from '@/types'
import { useSettings } from '../hooks/useSettings'

function PreviewTab({ tab }: { tab: NavTab }) {
  return (
    <span className="flex flex-col items-center gap-1 text-muted-foreground">
      <tab.Icon size={20} strokeWidth={1.8} />
      <span className="max-w-full truncate text-[10px] font-medium leading-none">{tab.label}</span>
    </span>
  )
}

/** Settings → Bottom bar: pick the two pages beside the + button. */
export default function NavBarCard() {
  const { settings, updateSettings } = useSettings()
  const slots = navTabsFrom(settings)

  function choose(slot: 0 | 1, id: NavTabId) {
    const next: NavTabId[] = [...slots]
    const other = slot === 0 ? 1 : 0
    if (next[other] === id) next[other] = next[slot] // picking the other slot's page swaps them
    next[slot] = id
    void updateSettings({ navTabs: next })
  }

  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-card p-5">
      <div className="grid grid-cols-5 items-center gap-1 rounded-2xl bg-background px-1 py-3" aria-hidden="true">
        <PreviewTab tab={HOME_TAB} />
        <PreviewTab tab={NAV_CHOICES[slots[0]]} />
        <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background"><Plus size={20} /></span>
        <PreviewTab tab={NAV_CHOICES[slots[1]]} />
        <PreviewTab tab={SETTINGS_TAB} />
      </div>

      {([0, 1] as const).map(slot => (
        <div key={slot} className="flex flex-col gap-2">
          <p className="eyebrow text-muted-foreground">{slot === 0 ? 'Left of +' : 'Right of +'}</p>
          <div className="flex flex-wrap gap-2">
            {NAV_ORDER.map(id => {
              const tab = NAV_CHOICES[id]
              const on = slots[slot] === id
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => choose(slot, id)}
                  className={cn(
                    'flex h-11 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors',
                    on ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-accent',
                  )}
                >
                  <tab.Icon size={16} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">Home and Settings stay at the ends. Pages that aren’t in the bar are listed on your Profile.</p>
    </div>
  )
}
