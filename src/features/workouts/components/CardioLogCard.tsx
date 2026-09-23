import { Check } from 'lucide-react'
import Segmented from '@/components/Segmented'
import { cn } from '@/lib/utils'
import { INTENSITIES, cardioKcal, formatKm, formatPace, rpeFor, showsDistance } from '@/lib/cardio'
import { resolveBodyKg } from '@/lib/workoutMath'
import { useWorkoutStore } from '../store'
import { parsePositive, sanitizeNumeric, type BlockDraft, type LastSet } from '../types'
import BlockHeader from './BlockHeader'

interface Props {
  block: BlockDraft
  blockIdx: number
  isFirst: boolean
  isLast: boolean
  onShowInfo: () => void
  bodyKg?: number
}

function describeLast(l: LastSet): string {
  return [l.duration ? `${l.duration} min` : null, l.distanceKm ? formatKm(l.distanceKm) : null].filter(Boolean).join(' · ')
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        enterKeyHint="done"
        placeholder="–"
        value={value}
        onChange={e => onChange(sanitizeNumeric(e.target.value))}
        onFocus={e => e.currentTarget.select()}
        className="h-12 w-full min-w-0 rounded-xl bg-secondary text-center text-lg font-semibold outline-none focus:ring-2 focus:ring-primary"
      />
    </label>
  )
}

/** Cardio is one entry: time, optional distance, effort. Pace and calories update as you type. */
export default function CardioLogCard({ block, blockIdx, isFirst, isLast, onShowInfo, bodyKg }: Props) {
  const { updateSet, toggleDone } = useWorkoutStore()
  const id = block.exercise.uuid
  const distance = showsDistance(id)
  const last = block.lastSets?.[0]
  const lastText = last ? describeLast(last) : ''

  return (
    <section className="rounded-3xl bg-card p-4">
      <BlockHeader
        name={block.exercise.name}
        blockIdx={blockIdx}
        isFirst={isFirst}
        isLast={isLast}
        onShowInfo={onShowInfo}
        subtitle={<>Cardio{lastText && <> · last time {lastText}</>}</>}
      />
      <div className="flex flex-col gap-3">
        {block.sets.map((set, setIdx) => {
          const entry = { duration: parsePositive(set.duration), distanceKm: parsePositive(set.distanceKm), rpe: rpeFor(set.intensity ?? 'moderate') }
          const pace = formatPace(id, entry)
          const kcal = Math.round(cardioKcal(id, entry, resolveBodyKg(bodyKg)))
          return (
            <div key={set.uuid} className={cn('flex flex-col gap-3 rounded-2xl transition-colors', set.done && '-m-2 bg-primary/10 p-2')}>
              <div className={cn('grid gap-2', distance ? 'grid-cols-2' : 'grid-cols-1')}>
                <Field label="Time (min)" value={set.duration} onChange={v => updateSet(blockIdx, setIdx, 'duration', v)} />
                {distance && <Field label="Distance (km)" value={set.distanceKm} onChange={v => updateSet(blockIdx, setIdx, 'distanceKm', v)} />}
              </div>
              <Segmented
                size="sm"
                value={set.intensity ?? 'moderate'}
                options={INTENSITIES}
                onChange={v => updateSet(blockIdx, setIdx, 'intensity', v)}
                className="bg-secondary"
              />
              <div className="flex items-center gap-3">
                <p className="min-w-0 flex-1 text-sm text-muted-foreground">
                  {[pace, kcal > 0 ? `≈ ${kcal} kcal` : null].filter(Boolean).join(' · ') || 'Enter your time to see calories'}
                </p>
                <button
                  type="button"
                  onClick={() => toggleDone(blockIdx, setIdx)}
                  disabled={!entry.duration && !set.done}
                  aria-pressed={set.done}
                  className={cn(
                    'flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-all active:scale-95 disabled:opacity-40',
                    set.done ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'bg-secondary',
                  )}
                >
                  <Check size={18} strokeWidth={3} /> {set.done ? 'Logged' : 'Log it'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
