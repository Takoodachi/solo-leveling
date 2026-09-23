import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { DEFAULT_RADAR, MIN_RADAR_MUSCLES, VOLUME_MUSCLES, type VolumeMuscle } from '../volume'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  shown: readonly VolumeMuscle[]
  onChange: (muscles: VolumeMuscle[]) => void
}

/** Pick the muscles on the radar (at least three, so it stays a shape). */
export default function CustomizeRadarSheet({ open, onOpenChange, shown, onChange }: Props) {
  const toggle = (key: VolumeMuscle, on: boolean) =>
    // Keep radar order no matter the order they're switched on.
    onChange(VOLUME_MUSCLES.map(m => m.key).filter(k => (k === key ? on : shown.includes(k))))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="px-4">
        <SheetHeader className="text-left">
          <SheetTitle className="text-xl">Customize radar</SheetTitle>
          <SheetDescription>Choose the muscle groups on the chart. Keep at least {MIN_RADAR_MUSCLES}.</SheetDescription>
        </SheetHeader>
        <ul className="mt-4 flex flex-col gap-2">
          {VOLUME_MUSCLES.map(m => {
            const on = shown.includes(m.key)
            return (
              <li key={m.key} className="flex min-h-12 items-center gap-3 rounded-2xl bg-secondary/60 py-1.5 pl-4 pr-3">
                <span className="min-w-0 flex-1 text-sm font-semibold">{m.label}</span>
                <Switch
                  checked={on}
                  disabled={on && shown.length <= MIN_RADAR_MUSCLES}
                  onCheckedChange={v => toggle(m.key, v)}
                  aria-label={`Show ${m.label} on the radar`}
                />
              </li>
            )
          })}
        </ul>
        <Button variant="ghost" className="mt-4 w-full" onClick={() => onChange([...DEFAULT_RADAR])}>Reset to default</Button>
      </SheetContent>
    </Sheet>
  )
}
