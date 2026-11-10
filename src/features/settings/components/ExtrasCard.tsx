import { Switch } from '@/components/ui/switch'
import { useAuthStore } from '@/features/auth/authStore'
import { useSettings } from '../hooks/useSettings'
import { extraOn, extrasHere } from '../extras'

/** Settings → Extras: a switch for each thing the app does by itself (features/settings/extras.ts). */
export default function ExtrasCard() {
  const { settings, updateSettings } = useSettings()
  const signedIn = useAuthStore(s => !!s.userId)
  return (
    <div className="flex flex-col rounded-3xl bg-card px-4">
      {extrasHere(signedIn).map(x => (
        // The id is what the search links to (opens the section and lands here)
        <div key={x.key} id={`extras--${x.key}`} className="flex items-center gap-3 border-b border-foreground/5 py-3.5 last:border-0">
          <div className="min-w-0 flex-1">
            <p className="font-medium">{x.label}</p>
            <p className="text-xs text-muted-foreground">{x.description}</p>
          </div>
          <Switch
            checked={extraOn(x.key, settings?.extras)}
            onCheckedChange={on => void updateSettings({ extras: { ...settings?.extras, [x.key]: on } })}
            aria-label={x.label}
          />
        </div>
      ))}
    </div>
  )
}
