import { toast } from 'sonner'
import type { AppShortcutId } from '@/types'
import { cn } from '@/lib/utils'
import { soloHas } from '@/lib/native'
import { APP_SHORTCUTS, APP_SHORTCUT_ORDER, MAX_APP_SHORTCUTS, appShortcutsFrom } from '../appShortcuts'
import { changeSettings, useSettings } from '../hooks/useSettings'

/** Settings → App icon (Android app): what a long-press on the icon offers, and in which order. */
export default function AppShortcutsCard() {
  const { settings } = useSettings()
  const chosen = appShortcutsFrom(settings)
  // An app installed before this was a setting keeps the three it was built with
  const canChange = soloHas('setShortcuts')

  function toggle(id: AppShortcutId) {
    void changeSettings(saved => {
      const now = appShortcutsFrom(saved)
      if (now.includes(id)) return { appShortcuts: now.filter(c => c !== id) }
      if (now.length < MAX_APP_SHORTCUTS) return { appShortcuts: [...now, id] }
      toast(`The icon holds ${MAX_APP_SHORTCUTS}. Take one off first.`)
      return null
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-card p-5">
      <p className="text-sm text-muted-foreground">
        Press and hold the app’s icon on your phone to jump straight in. Pick up to {MAX_APP_SHORTCUTS}; they’re listed in the order you tap them.
      </p>
      <div className="flex flex-wrap gap-2">
        {APP_SHORTCUT_ORDER.map(id => {
          const { label, Icon } = APP_SHORTCUTS[id]
          const place = chosen.indexOf(id) + 1
          return (
            <button
              key={id}
              type="button"
              disabled={!canChange}
              aria-pressed={place > 0}
              onClick={() => toggle(id)}
              className={cn(
                'flex h-11 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors disabled:opacity-60',
                place > 0 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-accent',
              )}
            >
              {place > 0 ? <span className="w-4 text-center text-xs font-bold tabular-nums">{place}</span> : <Icon size={16} />}
              {label}
            </button>
          )
        })}
      </div>
      {!canChange && <p className="text-xs text-muted-foreground">Install the latest Android app to change these.</p>}
    </div>
  )
}
