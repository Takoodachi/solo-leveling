import { Pill } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useSettings } from '../hooks/useSettings'

/** Show / hide the daily creatine tick on Home. */
export default function CheckinsCard() {
  const { settings, updateSettings } = useSettings()
  const on = settings?.creatineEnabled !== false

  return (
    <div className="flex items-center gap-3 rounded-3xl bg-card p-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        <Pill size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Creatine</p>
        <p className="text-sm text-muted-foreground">Daily check on the Home screen</p>
      </div>
      <Switch checked={on} onCheckedChange={v => void updateSettings({ creatineEnabled: v })} aria-label="Show creatine check on Home" />
    </div>
  )
}
