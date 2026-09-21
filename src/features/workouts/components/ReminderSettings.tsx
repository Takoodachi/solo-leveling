import { Clock, Bell } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import type { Settings } from '@/types'
import { updateSettings } from '@/features/settings/hooks/useSettings'

/**
 * Reminder preferences. Stored (and synced) now; delivering them needs Web Push
 * from a server-side scheduler, which isn't set up yet.
 * TODO: send reminders via Supabase pg_cron + an Edge Function + Web Push (VAPID).
 */
export default function ReminderSettings({ settings }: { settings: Settings | undefined }) {
  const enabled = settings?.reminderEnabled ?? false
  const time = settings?.reminderTime ?? '09:30'
  const days = settings?.reminderDays ?? 'workout-days'

  return (
    <div className="rounded-3xl bg-card p-4">
      <div className="flex items-center justify-between gap-3 px-1">
        <div>
          <p className="font-semibold">Notification</p>
          <p className="text-sm text-muted-foreground">{enabled ? 'on' : 'off'}</p>
        </div>
        <Switch checked={enabled} onCheckedChange={v => void updateSettings({ reminderEnabled: v })} aria-label="Workout reminder" />
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-2xl bg-secondary p-2">
        <label className="flex flex-1 items-center gap-2 rounded-xl px-2 py-1.5">
          <Clock size={18} className="shrink-0 text-muted-foreground" />
          <input
            type="time"
            value={time}
            onChange={e => void updateSettings({ reminderTime: e.target.value })}
            className="w-full min-w-0 bg-transparent font-medium outline-none [color-scheme:dark]"
            aria-label="Reminder time"
          />
        </label>
        <button
          type="button"
          onClick={() => void updateSettings({ reminderDays: days === 'daily' ? 'workout-days' : 'daily' })}
          className="flex items-center gap-2 rounded-xl px-3 py-1.5 font-medium hover:bg-accent"
        >
          <Bell size={18} className="text-muted-foreground" />
          {days === 'daily' ? 'Every day' : 'Workout days'}
        </button>
      </div>
      <p className="mt-3 px-1 text-xs text-muted-foreground">
        Saved to your profile. Push delivery isn’t switched on yet — reminders will start once it is.
      </p>
    </div>
  )
}
