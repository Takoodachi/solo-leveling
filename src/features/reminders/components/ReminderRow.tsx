import { Switch } from '@/components/ui/switch'
import type { ReminderPref } from '@/types'
import type { ReminderDef } from '../reminders'

interface Props {
  def: ReminderDef
  pref: ReminderPref
  onChange: (next: ReminderPref) => void
}

const pill = 'flex h-11 items-center gap-2 rounded-xl bg-secondary px-3 text-sm font-medium'

/** One reminder: its switch and, once on, its time (and for workouts, which days). */
export default function ReminderRow({ def, pref, onChange }: Props) {
  return (
    <div className="border-b border-foreground/5 py-3 last:border-0">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{def.label}</p>
          <p className="text-xs text-muted-foreground">{def.description}</p>
        </div>
        <Switch checked={pref.on} onCheckedChange={on => onChange({ ...pref, on })} aria-label={`${def.label} reminder`} />
      </div>
      {pref.on && (
        <div className="mt-2 flex flex-wrap gap-2">
          <label className={pill}>
            <input
              type="time"
              value={pref.time}
              onChange={e => e.target.value && onChange({ ...pref, time: e.target.value })}
              aria-label={`${def.label} reminder time`}
              className="min-w-0 bg-transparent text-base font-medium tabular-nums outline-none"
            />
          </label>
          {def.kind === 'workout' && (
            <button type="button" className={`${pill} hover:bg-accent`} onClick={() => onChange({ ...pref, days: pref.days === 'daily' ? 'workout-days' : 'daily' })}>
              {pref.days === 'daily' ? 'Every day' : 'Days with a routine'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
