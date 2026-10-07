import { useState } from 'react'
import { Check, Pencil, Plus } from 'lucide-react'
import type { CustomTheme } from '@/types'
import { cn } from '@/lib/utils'
import { CUSTOM_THEME, THEMES, customTheme, resolveTheme, type Theme } from '../themes'
import { DEFAULT_CUSTOM, cleanCustomTheme } from '../themeBuilder'
import { paintTheme } from '../hooks/useTheme'
import { useSettings } from '../hooks/useSettings'
import CustomThemeEditor from './CustomThemeEditor'

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

/** Settings → Theme: preset palettes, dark and light, and one of your own. The choice syncs with the account. */
export default function ThemePicker() {
  const { settings, updateSettings } = useSettings()
  const [editing, setEditing] = useState(false)
  const own = customTheme(settings?.customTheme)
  const active = resolveTheme(settings?.theme, settings?.customTheme).id

  function pick(id: string) {
    paintTheme(id, settings?.customTheme) // right away, before the setting round-trips through Dexie
    void updateSettings({ theme: id })
  }

  async function save(custom: CustomTheme) {
    await updateSettings({ customTheme: custom, theme: CUSTOM_THEME })
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-3 rounded-3xl bg-card p-4">
        <p className="eyebrow px-1 text-muted-foreground">Your own theme</p>
        <CustomThemeEditor initial={cleanCustomTheme(settings?.customTheme) ?? DEFAULT_CUSTOM} onSave={c => void save(c)} onCancel={() => setEditing(false)} />
      </div>
    )
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
      <div className="flex flex-col gap-2">
        <p className="eyebrow px-1 text-muted-foreground">Your own</p>
        <div className="grid grid-cols-3 gap-1.5">
          {own && <Swatch theme={own} active={active === CUSTOM_THEME} onPick={() => pick(CUSTOM_THEME)} />}
          <button type="button" onClick={() => setEditing(true)} className="flex min-w-0 flex-col gap-1.5 rounded-2xl p-1.5 text-left">
            <span className="flex h-16 items-center justify-center rounded-xl border border-dashed border-foreground/25 text-muted-foreground">
              {own ? <Pencil size={18} /> : <Plus size={20} />}
            </span>
            <span className="truncate px-0.5 text-xs font-medium">{own ? 'Edit colours' : 'Make your own'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
