import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import type { WeightUnit } from '@/types'
import { cn } from '@/lib/utils'
import { sanitizeNumeric as sanitize, type SetDraft, type LastSet } from '../types'
import { SET_COLUMNS, SET_GRID, type SetField, type SetRowMode } from '../setColumns'

function describeLast(s: LastSet | undefined, mode: SetRowMode, unit: WeightUnit): string {
  if (!s) return '—'
  if (mode === 'load') {
    if (s.weight != null && s.reps != null) return `${s.weight}×${s.reps}`
    if (s.reps != null) return `${s.reps} reps`
    return s.weight != null ? `${s.weight} ${unit}` : '—'
  }
  const parts: string[] = []
  if (s.duration != null) parts.push(`${s.duration}m`)
  if (s.distanceKm != null) parts.push(`${s.distanceKm}km`)
  return parts.join(' · ') || '—'
}

/** How long "Remove set" stays up before the row goes back to normal. */
const ARMED_MS = 4000

interface Props {
  index: number
  set: SetDraft
  mode: SetRowMode
  /** The unit the weight field and `last` are in. */
  unit?: WeightUnit
  last?: LastSet
  onChange: (field: SetField, value: string) => void
  onToggleDone: () => void
  onUseLast: () => void
  /** Takes this set out. Left off for an exercise's only set. */
  onRemove?: () => void
}

export default function SetRow({ index, set, mode, unit = 'kg', last, onChange, onToggleDone, onUseLast, onRemove }: Props) {
  // Tapping the set's number offers to remove it: two taps, so a stray one costs nothing
  const [armed, setArmed] = useState(false)
  const removing = armed && !!onRemove

  useEffect(() => {
    if (!armed) return
    const timer = setTimeout(() => setArmed(false), ARMED_MS)
    return () => clearTimeout(timer)
  }, [armed])

  return (
    <div
      className={cn(
        'grid items-center gap-2 rounded-2xl px-1 py-1 transition-colors',
        set.done && 'bg-primary/10',
      )}
      style={{ gridTemplateColumns: SET_GRID[mode] }}
    >
      <button
        type="button"
        onClick={() => setArmed(a => !a)}
        disabled={!onRemove}
        aria-expanded={removing}
        aria-label={removing ? `Keep set ${index + 1}` : `Set ${index + 1}: remove`}
        className={cn(
          // The number is narrow, so the tap area reaches a little past it on both sides
          'relative flex h-11 items-center justify-center text-sm font-semibold after:absolute after:inset-y-0 after:-left-2 after:-right-1',
          removing ? 'text-destructive' : set.done ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        {removing ? <X size={16} strokeWidth={2.5} /> : index + 1}
      </button>
      {removing ? (
        <button
          type="button"
          onClick={() => {
            setArmed(false)
            onRemove()
          }}
          className="h-11 rounded-xl bg-destructive/15 text-sm font-semibold text-destructive"
          style={{ gridColumn: `span ${1 + SET_COLUMNS[mode].length}` }}
        >
          Remove set {index + 1}
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={onUseLast}
            disabled={!last}
            className="truncate text-left text-sm text-muted-foreground disabled:opacity-60"
            aria-label="Copy previous set"
          >
            {describeLast(last, mode, unit)}
          </button>
          {SET_COLUMNS[mode].map(([field, label, keyboard]) => (
            <input
              key={field}
              type="text"
              inputMode={keyboard}
              enterKeyHint="next"
              aria-label={field === 'weight' ? unit : label}
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
        </>
      )}
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
