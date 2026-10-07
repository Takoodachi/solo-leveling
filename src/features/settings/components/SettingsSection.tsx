import { useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { ChevronDown, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  /** The anchor search results link to (`/settings#theme`); arriving on it opens the section. */
  id: string
  title: string
  /** What's set right now, shown while it's closed ("Ember", "2 on"). */
  summary?: string
  Icon: LucideIcon
  children: ReactNode
}

/** Sections left open stay open while the app runs, so coming back to Settings looks the same. */
const opened = new Set<string>()

/** One row of the Settings page: tap it to show what's inside, tap again to put it away. */
export default function SettingsSection({ id, title, summary, Icon, children }: Props) {
  const { hash } = useLocation()
  const [open, setOpen] = useState(() => opened.has(id) || hash === `#${id}`)

  function toggle() {
    if (open) opened.delete(id)
    else opened.add(id)
    setOpen(!open)
  }

  return (
    <section id={id} className="rounded-3xl bg-card">
      <button type="button" onClick={toggle} aria-expanded={open} aria-controls={`${id}-panel`} className="flex w-full items-center gap-3 p-4 text-left">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary"><Icon size={18} /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{title}</span>
          {summary && <span className="block truncate text-xs text-muted-foreground">{summary}</span>}
        </span>
        <ChevronDown size={20} className={cn('shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {/* The cards inside keep their own padding; on this card's surface they read as one */}
      {open && <div id={`${id}-panel`} className="-mt-2 flex flex-col">{children}</div>}
    </section>
  )
}
