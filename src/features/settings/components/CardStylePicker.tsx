import type { CSSProperties } from 'react'
import { Check } from 'lucide-react'
import type { CardStyle } from '@/types'
import { cn } from '@/lib/utils'
import { CARD_STYLES, applyCardStyle, cardStyleOf } from '../cardStyle'
import { useSettings } from '../hooks/useSettings'

// The small card in each choice, drawn by hand in the theme's colours: the real rules hang off
// <html>, so they can't be shown five ways at once. Keep these looking like index.css's.
const PREVIEW: Record<CardStyle, CSSProperties> = {
  solid: { background: 'hsl(var(--card))' },
  glass: { background: 'hsl(var(--card) / 0.45)', boxShadow: 'inset 0 0 0 1px hsl(var(--foreground) / 0.12), inset 0 1px 0 hsl(0 0% 100% / 0.3)' },
  outline: { boxShadow: 'inset 0 0 0 1.5px hsl(var(--foreground) / 0.3)' },
  glow: { background: 'linear-gradient(140deg, hsl(var(--brand-from) / 0.4), hsl(var(--card)) 75%)', boxShadow: 'inset 0 0 0 1px hsl(var(--primary) / 0.35)' },
  bold: { background: 'hsl(var(--card))', boxShadow: '0 0 0 2px hsl(var(--foreground) / 0.9), 3px 3px 0 1px hsl(var(--primary))' },
}
const GLOW = 'radial-gradient(60% 75% at 12% 15%, hsl(var(--brand-from) / 0.75), transparent 70%), radial-gradient(55% 70% at 92% 85%, hsl(var(--brand-to) / 0.65), transparent 70%)'

/** Settings → Theme: how cards are drawn, everywhere in the app. The choice syncs with the account. */
export default function CardStylePicker() {
  const { settings, updateSettings } = useSettings()
  const active = cardStyleOf(settings?.cardStyle)

  function pick(id: CardStyle) {
    applyCardStyle(id) // right away, before the setting round-trips through Dexie
    void updateSettings({ cardStyle: id })
  }

  return (
    <div className="flex flex-col gap-2 rounded-3xl bg-card p-4">
      <p className="eyebrow px-1 text-muted-foreground">Card style</p>
      <div className="grid grid-cols-3 gap-1.5">
        {CARD_STYLES.map(s => (
          <button
            key={s.id}
            type="button"
            onClick={() => pick(s.id)}
            aria-pressed={s.id === active}
            aria-label={`${s.name} cards`}
            className={cn('flex min-w-0 flex-col gap-1.5 rounded-2xl p-1.5 text-left ring-2 transition-colors', s.id === active ? 'ring-primary' : 'ring-transparent hover:ring-border')}
          >
            <span className="flex h-16 items-center justify-center rounded-xl border border-border bg-background" style={s.id === 'glass' ? { backgroundImage: GLOW } : undefined}>
              <span className="flex h-9 w-4/5 flex-col justify-center gap-1 rounded-lg px-2" style={PREVIEW[s.id]}>
                <span className="block h-1.5 w-3/5 rounded-full bg-foreground" />
                <span className="block h-1.5 w-full rounded-full bg-foreground/20">
                  <span className="block h-full w-2/3 rounded-full bg-primary" />
                </span>
              </span>
            </span>
            <span className="flex items-center justify-between gap-1 px-0.5 text-xs font-medium">
              <span className="truncate">{s.name}</span>
              {s.id === active && <Check size={14} className="shrink-0 text-primary" />}
            </span>
          </button>
        ))}
      </div>
      <p className="px-1 text-xs text-muted-foreground">{CARD_STYLES.find(s => s.id === active)?.blurb}</p>
    </div>
  )
}
