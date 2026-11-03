import { Check } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { musicAppsHere, type MusicApp } from '../music'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The app chosen now, ticked. */
  current: string | null
  onPick: (app: MusicApp) => void
}

/** Which music app the workout screen's music button opens, on this device. */
export default function MusicAppSheet({ open, onOpenChange, current, onPick }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto px-4">
        <SheetHeader className="text-left">
          <SheetTitle className="text-xl">Your music app</SheetTitle>
          <SheetDescription>The music button on the workout screen opens it. Change it any time in Settings → Workouts.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-1 pb-safe pt-3">
          {musicAppsHere().map(app => (
            <button
              key={app.id}
              type="button"
              onClick={() => onPick(app)}
              className={cn('flex min-h-12 items-center justify-between rounded-2xl px-4 text-left transition-colors hover:bg-accent', app.id === current && 'bg-accent')}
            >
              <span className="font-medium">{app.name}</span>
              {app.id === current && <Check size={18} className="text-primary" />}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
