import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { THEMES, themeById, type Theme } from '../themes'
import { paintTheme } from '../hooks/useTheme'
import { useSettings } from '../hooks/useSettings'

const hsl = (v: string) => `hsl(${v})`

/** A tiny mock of the app drawn in the theme's own colours. */
function Swatch({ theme, active, onPick }: { theme: Theme; active: boolean; onPick: () => void }) {
  const v = theme.vars
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={active}
      aria-label={`${theme.name} theme`}
      className={cn('flex min-w-0 flex-col gap-1.5 rounded-2xl p-1.5 text-left ring-2 transition-colors', active ? 'ring-primary' : 'ring-transparent hover:ring-border')}
    >
      <span className="relative block h-16 overflow-hidden rounded-xl border" style={{ background: hsl(v.background), borderColor: hsl(v.border) }}>
        <span className="absolute inset-x-2 top-2 flex flex-col gap-1 rounded-lg p-1.5" style={{ background: hsl(v.card) }}>
          <span className="block h-1.5 w-3/5 rounded-full" style={{ background: hsl(v.foreground) }} />
          <span className="block h-1.5 w-full rounded-full" style={{ background: hsl(v.secondary) }}>
            <span className="block h-full w-2/3 rounded-full" style={{ background: hsl(v.primary) }} />
          </span>
        </span>
        <span
          className="absolute bottom-1.5 right-2 h-4 w-4 rounded-md"
          style={{ backgroundImage: `linear-gradient(135deg, ${hsl(v['brand-from'])}, ${hsl(v['brand-to'])})` }}
        />
      </span>
      <span className="flex items-center justify-between gap-1 px-0.5 text-xs font-medium">
        <span className="truncate">{theme.name}</span>
        {active && <Check size={14} className="shrink-0 text-primary" />}
      </span>
    </button>
  )
}

/** Settings → Theme: preset palettes, dark and light. The choice syncs with the account. */
export default function ThemePicker() {
  const { settings, updateSettings } = useSettings()
  const active = themeById(settings?.theme).id

  function pick(id: string) {
    paintTheme(id) // right away, before the setting round-trips through Dexie
    void updateSettings({ theme: id })
  }

  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-card p-4">
      {(['dark', 'light'] as const).map(mode => (
        <div key={mode} className="flex flex-col gap-2">
          <p className="eyebrow px-1 text-muted-foreground">{mode === 'dark' ? 'Dark' : 'Light'}</p>
          <div className="grid grid-cols-3 gap-1.5">
            {THEMES.filter(t => t.mode === mode).map(t => (
              <Swatch key={t.id} theme={t} active={t.id === active} onPick={() => pick(t.id)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
