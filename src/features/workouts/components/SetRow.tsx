import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SetMode } from '@/lib/workoutMath'
import type { SetDraft, LastSet } from '../types'
import { SET_COLUMNS, type SetField } from '../setColumns'

function describeLast(s: LastSet | undefined, mode: SetMode): string {
  if (!s) return '—'
  if (mode === 'load') {
    if (s.weight != null && s.reps != null) return `${s.weight}×${s.reps}`
    if (s.reps != null) return `${s.reps} reps`
    return s.weight != null ? `${s.weight} kg` : '—'
  }
  const parts: string[] = []
  if (s.duration != null) parts.push(`${s.duration}m`)
  if (s.distanceKm != null) parts.push(`${s.distanceKm}km`)
  return parts.join(' · ') || '—'
}

/** Accept "12", "12.5" and "12,5" while typing. */
function sanitize(v: string): string {
  const cleaned = v.replace(',', '.').replace(/[^\d.]/g, '')
  const [int, ...rest] = cleaned.split('.')
  return rest.length ? `${int}.${rest.join('')}` : int
}

interface Props {
  index: number
  set: SetDraft
  mode: SetMode
  last?: LastSet
  onChange: (field: SetField, value: string) => void
  onToggleDone: () => void
  onUseLast: () => void
}

export default function SetRow({ index, set, mode, last, onChange, onToggleDone, onUseLast }: Props) {
  return (
    <div
      className={cn(
        'grid grid-cols-[2rem_minmax(0,1fr)_4.5rem_4.5rem_2.75rem] items-center gap-2 rounded-2xl px-1 py-1 transition-colors',
        set.done && 'bg-primary/10',
      )}
    >
      <span className={cn('text-center text-sm font-semibold', set.done ? 'text-primary' : 'text-muted-foreground')}>
        {index + 1}
      </span>
      <button
        type="button"
        onClick={onUseLast}
        disabled={!last}
        className="truncate text-left text-sm text-muted-foreground disabled:opacity-60"
        aria-label="Copy previous set"
      >
        {describeLast(last, mode)}
      </button>
      {SET_COLUMNS[mode].map(([field, label, keyboard]) => (
        <input
          key={field}
          type="text"
          inputMode={keyboard}
          enterKeyHint="next"
          aria-label={label}
          placeholder={label === 'reps' ? '0' : '–'}
          value={set[field]}
          onChange={e => onChange(field, sanitize(e.target.value))}
          onFocus={e => e.currentTarget.select()}
          className={cn(
            'h-11 w-full min-w-0 rounded-xl bg-secondary text-center text-base font-semibold outline-none transition-colors',
            'focus:ring-2 focus:ring-primary',
            set.done && 'bg-transparent',
          )}
        />
      ))}
      <button
        type="button"
        onClick={onToggleDone}
        aria-label={set.done ? 'Mark set not done' : 'Mark set done'}
        aria-pressed={set.done}
        className={cn(
          'flex h-11 w-11 items-center justify-center rounded-xl transition-all active:scale-90',
          set.done ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'bg-secondary text-muted-foreground',
        )}
      >
        <Check size={20} strokeWidth={3} />
      </button>
    </div>
  )
}
