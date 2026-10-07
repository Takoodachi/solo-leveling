import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { CustomTheme } from '@/types'
import { Button } from '@/components/ui/button'
import Segmented from '@/components/Segmented'
import { cn } from '@/lib/utils'
import { CUSTOM_RANGES, cleanCustomTheme, customTokens, hsl, parseHsl, withMode, type Hsl } from '../themeBuilder'
import { CUSTOM_THEME } from '../themes'
import { paintTheme, repaintSavedTheme } from '../hooks/useTheme'
import ColorSliders from './ColorSliders'

type Part = 'accent' | 'background' | 'gradient'

const MODES = [{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }] as const
const PARTS: { key: Part; label: string; hint: string }[] = [
  { key: 'accent', label: 'Accent', hint: 'Highlights, progress, switches' },
  { key: 'background', label: 'Background', hint: 'Tints every surface' },
  { key: 'gradient', label: 'Gradient', hint: 'Where the accent fades to' },
]

interface Props {
  initial: CustomTheme
  onSave: (theme: CustomTheme) => void
  onCancel: () => void
}

/** Settings → Theme → your own: three colours on a dark or light base. The app itself is the preview. */
export default function CustomThemeEditor({ initial, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState(initial)
  const [open, setOpen] = useState<Part | null>('accent')
  const tokens = customTokens(draft)
  const range = CUSTOM_RANGES[draft.mode]
  // The gradient follows the accent until it's given a colour of its own
  const colour: Record<Part, string> = { accent: draft.accent, background: draft.background, gradient: draft.gradient ?? tokens['brand-to'] }

  useEffect(() => paintTheme(CUSTOM_THEME, draft, false), [draft])

  // Closing (saved, cancelled or by leaving the page) puts the saved theme back
  const previewing = useRef(false)
  useEffect(() => {
    previewing.current = true
    return () => {
      previewing.current = false
      void repaintSavedTheme(() => !previewing.current)
    }
  }, [])

  const change = (patch: Partial<CustomTheme>) => setDraft(d => cleanCustomTheme({ ...d, ...patch }) ?? d)

  return (
    <div className="flex flex-col gap-3">
      <Segmented value={draft.mode} options={MODES} onChange={mode => setDraft(d => withMode(d, mode))} size="sm" className="bg-secondary" />
      <div className="flex flex-col">
        {PARTS.map(part => {
          const value = parseHsl(colour[part.key]) as Hsl
          const expanded = open === part.key
          const swatch = part.key === 'gradient' ? `linear-gradient(135deg, hsl(${tokens['brand-from']}), hsl(${tokens['brand-to']}))` : `hsl(${colour[part.key]})`
          return (
            <div key={part.key} className="border-b border-foreground/10 last:border-0">
              <button type="button" onClick={() => setOpen(expanded ? null : part.key)} aria-expanded={expanded} className="flex min-h-14 w-full items-center gap-3 text-left">
                <span className="size-8 shrink-0 rounded-full border border-foreground/20" style={{ background: swatch }} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{part.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {part.key === 'gradient' && !draft.gradient ? 'Follows the accent' : part.hint}
                  </span>
                </span>
                <ChevronDown size={18} className={cn('shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
              </button>
              {expanded && (
                <>
                  <ColorSliders
                    label={part.label}
                    value={value}
                    range={part.key === 'background' ? range.background : range.accent}
                    onChange={next => change({ [part.key]: hsl(next) })}
                  />
                  {part.key === 'gradient' && draft.gradient && (
                    <button type="button" onClick={() => setDraft(d => ({ mode: d.mode, accent: d.accent, background: d.background }))} className="mb-2 h-9 rounded-full bg-secondary px-3 text-xs font-semibold hover:bg-accent">
                      Follow the accent
                    </button>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button className="flex-1" onClick={() => onSave(draft)}>Save</Button>
      </div>
    </div>
  )
}
