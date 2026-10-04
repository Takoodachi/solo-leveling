import { Bell } from 'lucide-react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import type { ReminderKind, ReminderPref } from '@/types'
import { isAndroidApp } from '@/lib/native'
import { useSettings, updateSettings } from '@/features/settings/hooks/useSettings'
import { REMINDERS, reminderPrefs } from '../reminders'
import { useDeviceNotifications, type DeviceNotify } from '../useDeviceNotifications'
import ReminderRow from './ReminderRow'

const here = isAndroidApp() ? 'phone' : 'device'

const STATUS: Record<DeviceNotify, string> = {
  checking: 'Checking…',
  on: `On for this ${here}`,
  off: `Off for this ${here}`,
  blocked: isAndroidApp()
    ? 'Notifications are blocked. Allow them for Solo Leveling in Android’s app settings.'
    : 'Notifications are blocked for this app in your browser or phone settings.',
  'needs-install': 'On an iPhone, add the app to your Home Screen first (Share → Add to Home Screen), then switch this on there.',
  'needs-signin': 'Sign in to get reminders on this device.',
  'needs-update': 'Install the latest Android app to get reminders on this phone.',
  'not-set-up': 'Reminders aren’t available on this device yet.',
  unsupported: 'This browser can’t show notifications.',
}

/** Settings → Reminders: what to be reminded of and when (synced), and whether this device shows them. */
export default function RemindersCard() {
  const { settings } = useSettings()
  const device = useDeviceNotifications()
  if (!settings) return null

  const prefs = reminderPrefs(settings)
  const canToggle = device.state === 'on' || device.state === 'off' || device.state === 'blocked'
  const anyOn = REMINDERS.some(d => prefs[d.kind].on)

  // Saves every reminder, so the old workout-only setting is carried into the new one
  const change = (kind: ReminderKind, next: ReminderPref) => void updateSettings({ reminders: { ...prefs, [kind]: next } })

  async function toggleDevice(on: boolean) {
    const next = await device.set(on)
    if (on && next !== 'on') toast(next === 'blocked' ? STATUS.blocked : 'Couldn’t switch on notifications here')
  }

  return (
    <div className="flex flex-col rounded-3xl bg-card p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary"><Bell size={20} /></span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">Notifications</p>
          <p className="text-xs text-muted-foreground">{STATUS[device.state]}</p>
        </div>
        {canToggle && (
          <Switch
            checked={device.state === 'on'}
            disabled={device.busy}
            onCheckedChange={on => void toggleDevice(on)}
            aria-label={`Notifications on this ${here}`}
          />
        )}
      </div>
      {anyOn && device.state === 'off' && (
        <p className="mt-3 rounded-2xl bg-secondary px-3 py-2 text-xs text-muted-foreground">
          Reminders are set, but this {here} won’t show them until notifications are switched on above.
        </p>
      )}
      <div className="mt-2 flex flex-col">
        {REMINDERS.map(def => (
          <ReminderRow key={def.kind} def={def} pref={prefs[def.kind]} onChange={next => change(def.kind, next)} />
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        A reminder is skipped once you’ve logged that thing for the day. What you choose here follows your account; the switch at the top is per device.
      </p>
    </div>
  )
}
