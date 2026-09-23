import { ArrowDown, ArrowUp } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import type { HomeWidgetId } from '@/types'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { DEFAULT_HOME_WIDGETS, homeWidgetDef, homeWidgetsFrom } from '../homeWidgets'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const arrowBtn = 'flex h-11 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent disabled:opacity-25'

interface RowProps {
  id: HomeWidgetId
  /** Position on Home; undefined when hidden. */
  index?: number
  count: number
  onMove: (index: number, delta: -1 | 1) => void
  onToggle: (id: HomeWidgetId, on: boolean) => void
}

function WidgetRow({ id, index, count, onMove, onToggle }: RowProps) {
  const def = homeWidgetDef(id)
  if (!def) return null
  const on = index != null
  return (
    <li className="flex items-center gap-2 rounded-2xl bg-secondary/60 py-1.5 pl-3 pr-2">
      <def.icon size={18} className={on ? 'shrink-0 text-primary' : 'shrink-0 text-muted-foreground'} />
      <div className="min-w-0 flex-1 py-1">
        <p className="truncate text-sm font-semibold">{def.label}</p>
        <p className="truncate text-xs text-muted-foreground">{def.description}</p>
      </div>
      {on && (
        <>
          <button type="button" className={arrowBtn} disabled={index === 0} onClick={() => onMove(index, -1)} aria-label={`Move ${def.label} up`}>
            <ArrowUp size={16} />
          </button>
          <button type="button" className={arrowBtn} disabled={index === count - 1} onClick={() => onMove(index, 1)} aria-label={`Move ${def.label} down`}>
            <ArrowDown size={16} />
          </button>
        </>
      )}
      <Switch checked={on} onCheckedChange={v => onToggle(id, v)} aria-label={`Show ${def.label} on Home`} />
    </li>
  )
}

/** Pick which cards Home shows and in what order. Saved to settings, so it follows the account. */
export default function CustomizeHomeSheet({ open, onOpenChange }: Props) {
  const { settings, updateSettings } = useSettings()
  const shown = homeWidgetsFrom(settings)
  const hidden = DEFAULT_HOME_WIDGETS.filter(id => !shown.includes(id))
  const save = (ids: HomeWidgetId[]) => void updateSettings({ homeWidgets: ids })

  function move(i: number, delta: -1 | 1) {
    const next = [...shown]
    ;[next[i], next[i + delta]] = [next[i + delta], next[i]]
    save(next)
  }

  const toggle = (id: HomeWidgetId, on: boolean) => save(on ? [...shown, id] : shown.filter(x => x !== id))
  const rowProps = { count: shown.length, onMove: move, onToggle: toggle }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto px-4">
        <SheetHeader className="text-left">
          <SheetTitle className="text-xl">Customize Home</SheetTitle>
          <SheetDescription>Choose the cards on Today’s Plan and their order. Counters sit two to a row.</SheetDescription>
        </SheetHeader>

        <p className="eyebrow mb-2 mt-5 text-muted-foreground">On Home</p>
        {shown.length === 0 && <p className="mb-2 text-sm text-muted-foreground">Nothing yet. Switch cards on below.</p>}
        <ul className="flex flex-col gap-2">
          {shown.map((id, i) => <WidgetRow key={id} id={id} index={i} {...rowProps} />)}
        </ul>

        {hidden.length > 0 && (
          <>
            <p className="eyebrow mb-2 mt-5 text-muted-foreground">Hidden</p>
            <ul className="flex flex-col gap-2">
              {hidden.map(id => <WidgetRow key={id} id={id} {...rowProps} />)}
            </ul>
          </>
        )}

        <Button variant="ghost" className="mt-4 w-full" onClick={() => save(DEFAULT_HOME_WIDGETS)}>Show everything (default)</Button>
      </SheetContent>
    </Sheet>
  )
}
