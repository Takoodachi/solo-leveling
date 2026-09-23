import { useState } from 'react'
import { ChevronRight, LayoutGrid } from 'lucide-react'
import { HOME_WIDGETS, homeWidgetsFrom } from '@/features/dashboard/homeWidgets'
import CustomizeHomeSheet from '@/features/dashboard/components/CustomizeHomeSheet'
import { useSettings } from '../hooks/useSettings'

/** Profile entry point for choosing the Home screen cards. */
export default function HomeLayoutCard() {
  const { settings } = useSettings()
  const [open, setOpen] = useState(false)
  const shown = homeWidgetsFrom(settings).length

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-3 rounded-3xl bg-card p-5 text-left">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <LayoutGrid size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Customize Home</span>
          <span className="block truncate text-sm text-muted-foreground">{shown} of {HOME_WIDGETS.length} cards shown</span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
      </button>
      <CustomizeHomeSheet open={open} onOpenChange={setOpen} />
    </>
  )
}
