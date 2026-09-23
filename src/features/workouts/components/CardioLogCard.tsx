import { Check } from 'lucide-react'
import { toast } from 'sonner'
import Segmented from '@/components/Segmented'
import { cn } from '@/lib/utils'
import { INTENSITIES, cardioKcal, formatKm, formatPace, rpeFor, showsDistance } from '@/lib/cardio'
import { resolveBodyKg } from '@/lib/workoutMath'
import { useWorkoutStore } from '../store'
import { parsePositive, sanitizeNumeric, type BlockDraft, type LastSet } from '../types'
import BlockHeader from './BlockHeader'
import type { RankInfo } from '@/features/ranks/tiers'
import type { Sex } from '@/features/ranks/standards'
import { equivalent5k, formatRunTime, isRunExercise, liveRunRank, rateRun } from '@/features/ranks/running'
import RankBadge from '@/features/ranks/components/RankBadge'

interface Props {
  block: BlockDraft
  blockIdx: number
  isFirst: boolean
  isLast: boolean
  onShowInfo: () => void
  bodyKg?: number
  /** Running only: the best running rank so far, and the runner's sex for rating. */
  runRank?: RankInfo
  sex?: Sex
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
export default function CardioLogCard({ block, blockIdx, isFirst, isLast, onShowInfo, bodyKg, runRank, sex }: Props) {
  const { updateSet, toggleDone } = useWorkoutStore()
  const id = block.exercise.uuid
  const distance = showsDistance(id)
  const last = block.lastSets?.[0]
  const lastText = last ? describeLast(last) : ''
  const ranked = sex && isRunExercise(id) ? sex : null
  const entries = block.sets.map(s => ({ duration: parsePositive(s.duration), distanceKm: parsePositive(s.distanceKm) }))
  const rank = ranked
    ? entries.filter((_, i) => block.sets[i].done).reduce<RankInfo | undefined>((r, e) => liveRunRank(ranked, e, r), runRank)
    : undefined

  function handleLog(setIdx: number) {
    if (!toggleDone(blockIdx, setIdx) || !ranked) return
    const rating = rateRun(ranked, entries[setIdx].distanceKm, entries[setIdx].duration)
    const before = entries.filter((_, i) => i !== setIdx && block.sets[i].done).reduce<RankInfo | undefined>((r, e) => liveRunRank(ranked, e, r), runRank)
    const to = liveRunRank(ranked, entries[setIdx], before)
    if (rating <= 0 || !to || (before && to.step <= before.step)) return
    toast(before ? `Rank up! ${to.label}` : `Ranked ${to.label}`, {
      description: before ? `Running · was ${before.label}` : 'Running',
      icon: <RankBadge tier={to.tier.key} size={28} />,
    })
  }

  return (
    <section className="rounded-3xl bg-card p-4">
      <BlockHeader
        name={block.exercise.name}
        blockIdx={blockIdx}
        isFirst={isFirst}
        isLast={isLast}
        onShowInfo={onShowInfo}
        subtitle={
          <>
            Cardio{lastText && <> · last time {lastText}</>}
            {rank && (
              <span className="ml-1 inline-flex items-center gap-0.5 font-semibold" style={{ color: rank.tier.color }}>
                <RankBadge tier={rank.tier.key} size={18} /> {rank.label}
              </span>
            )}
          </>
        }
      />
      <div className="flex flex-col gap-3">
        {block.sets.map((set, setIdx) => {
          const entry = { ...entries[setIdx], rpe: rpeFor(set.intensity ?? 'moderate') }
          const pace = formatPace(id, entry)
          const kcal = Math.round(cardioKcal(id, entry, resolveBodyKg(bodyKg)))
          const fiveK = ranked ? equivalent5k(entry.distanceKm, entry.duration) : null
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
                  {fiveK != null && entry.distanceKm! > 5.05 && <span className="block text-xs">Worth a {formatRunTime(fiveK)} 5K</span>}
                </p>
                <button
                  type="button"
                  onClick={() => handleLog(setIdx)}
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
