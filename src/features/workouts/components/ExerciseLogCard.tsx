import { Check, Plus, Minus } from 'lucide-react'
import { toast } from 'sonner'
import type { WeightUnit } from '@/types'
import { setModeFor } from '@/lib/workoutMath'
import { useWorkoutStore } from '../store'
import { setHasValue, type BlockDraft } from '../types'
import SetRow from './SetRow'
import { SET_COLUMNS, SET_GRID, type SetRowMode } from '../setColumns'
import BlockHeader from './BlockHeader'
import BlockTools from './BlockTools'
import ProgressHint from './ProgressHint'
import UnitToggle from './UnitToggle'
import { applyFill, suggestProgress } from '../progression'
import { lastSetsIn, setsInKg } from '../units'
import { saveExerciseUnit } from '../hooks/useExerciseNote'
import type { RankInfo } from '@/features/ranks/tiers'
import { liveRank, rankUpFromSet, type RankContext } from '@/features/ranks/liveRank'
import RankBadge from '@/features/ranks/components/RankBadge'
import { ink } from '@/lib/colors'
import { tap } from '@/lib/haptics'
import { useSettings } from '@/features/settings/hooks/useSettings'

interface Props {
  block: BlockDraft
  blockIdx: number
  isFirst: boolean
  isLast: boolean
  onSetDone: (restSec: number) => void
  onShowInfo: () => void
  /** Swap this exercise for another one, in its place. */
  onReplace?: () => void
  /** Best rank so far on this lift (from history), if it's a ranked lift. */
  liftRank?: RankInfo
  rankContext: RankContext | null
}

/** After the last set is ticked, the tick shows for a moment before the card folds away. */
const FOLD_DELAY_MS = 600

export default function ExerciseLogCard({ block, blockIdx, isFirst, isLast, onSetDone, onShowInfo, onReplace, liftRank, rankContext }: Props) {
  const { addSet, removeSet, restoreSet, updateSet, toggleDone, foldIfDone, fillSets, setUnit, draft } = useWorkoutStore()
  const { settings } = useSettings()
  // Cardio blocks render CardioLogCard; here it's weight × reps or timed sets.
  const mode: SetRowMode = setModeFor(block.exercise) === 'time' ? 'time' : 'load'
  const done = block.sets.filter(s => s.done).length
  // The fields hold the block's unit; ranks only know kg, and last time's sets are stored in it
  const kgSets = setsInKg(block.sets, block.unit)
  const lastSets = lastSetsIn(block.lastSets, block.unit)
  const rank = rankContext ? liveRank(block.exercise.uuid, kgSets.filter(s => s.done), liftRank, rankContext) : liftRank
  // No "what to try today" while correcting a workout that's already happened, or with tips switched off
  const hint = draft?.editing || settings?.workoutTips === false ? null : suggestProgress({ ...block, bodyKg: rankContext?.bodyKg })
  const fill = hint?.fill
  const fillChanges = !!fill && applyFill(block.sets, fill).some((s, i) => s !== block.sets[i])

  function handleToggle(setIdx: number) {
    if (!toggleDone(blockIdx, setIdx)) return
    tap()
    onSetDone(block.restSec)
    announceRankUp(setIdx)
    // That was the last one: the card gets out of the way of the next exercise. Not while
    // correcting a past workout, where ticks are only being fixed.
    if (!draft?.editing && block.sets.every((s, i) => i === setIdx || s.done)) {
      window.setTimeout(() => foldIfDone(blockIdx, block.exercise.uuid), FOLD_DELAY_MS)
    }
  }

  // A set with something in it can be put back, like a removed exercise
  function handleRemoveSet(setIdx: number) {
    const removed = block.sets[setIdx]
    const startedAt = draft?.startedAt
    removeSet(blockIdx, setIdx)
    if (startedAt == null || !(removed.done || setHasValue(removed))) return
    toast(`Removed set ${setIdx + 1} of ${block.exercise.name}`, {
      duration: 7000,
      action: { label: 'Undo', onClick: () => restoreSet(blockIdx, setIdx, removed, block.exercise.uuid, startedAt) },
    })
  }

  function announceRankUp(setIdx: number) {
    if (!rankContext) return
    const others = kgSets.filter((s, i) => s.done && i !== setIdx)
    const up = rankUpFromSet(block.exercise.uuid, kgSets[setIdx], others, liftRank, rankContext)
    if (!up) return
    toast(up.from ? `Rank up! ${up.to.label}` : `Ranked ${up.to.label}`, {
      description: up.from ? `${block.exercise.name} · was ${up.from.label}` : block.exercise.name,
      icon: <RankBadge tier={up.to.tier.key} size={28} />,
    })
  }

  function copyLast(setIdx: number) {
    const last = lastSets?.[setIdx]
    if (!last) return
    if (last.weight != null) updateSet(blockIdx, setIdx, 'weight', String(last.weight))
    if (last.reps != null) updateSet(blockIdx, setIdx, 'reps', String(last.reps))
    if (last.duration != null) updateSet(blockIdx, setIdx, 'duration', String(last.duration))
    if (last.distanceKm != null) updateSet(blockIdx, setIdx, 'distanceKm', String(last.distanceKm))
  }

  // The fields keep their weight (60 kg reads 132.28 lb); the choice is remembered for this exercise
  function changeUnit(unit: WeightUnit) {
    setUnit(blockIdx, unit)
    void saveExerciseUnit(block.exercise.uuid, unit)
  }

  return (
    <section className="rounded-3xl bg-card p-4">
      <BlockHeader
        name={block.exercise.name}
        blockIdx={blockIdx}
        isFirst={isFirst}
        isLast={isLast}
        collapsed={block.collapsed}
        onShowInfo={onShowInfo}
        subtitle={
          <>
            {done === block.sets.length && <Check size={12} strokeWidth={3.5} className="text-primary" aria-label="All sets done" />}
            {done}/{block.sets.length} sets · rest {block.restSec}s
            {rank && (
              <span className="inline-flex items-center gap-0.5 font-semibold" style={{ color: ink(rank.tier.color) }}>
                <RankBadge tier={rank.tier.key} size={18} /> {rank.label}
              </span>
            )}
          </>
        }
      />

      {!block.collapsed && (
        <>
          <BlockTools exerciseId={block.exercise.uuid} onReplace={onReplace} />
          {hint && <ProgressHint hint={hint} onUse={fill && fillChanges ? () => fillSets(blockIdx, fill) : undefined} />}

          <div className="grid items-center gap-2 px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground" style={{ gridTemplateColumns: SET_GRID[mode] }}>
            <span className="text-center">Set</span>
            <span>Previous</span>
            {SET_COLUMNS[mode].map(([field, label]) => (
              field === 'weight'
                ? <UnitToggle key={field} unit={block.unit} onChange={changeUnit} />
                : <span key={field} className="text-center">{label}</span>
            ))}
            <span className="text-center">✓</span>
          </div>

          <div className="flex flex-col gap-1">
            {block.sets.map((set, setIdx) => (
              <SetRow
                key={set.uuid}
                index={setIdx}
                set={set}
                mode={mode}
                unit={block.unit}
                last={lastSets?.[setIdx]}
                onChange={(field, value) => updateSet(blockIdx, setIdx, field, value)}
                onToggleDone={() => handleToggle(setIdx)}
                onUseLast={() => copyLast(setIdx)}
                onRemove={block.sets.length > 1 ? () => handleRemoveSet(setIdx) : undefined}
              />
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => addSet(blockIdx)}
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-secondary text-sm font-semibold hover:bg-accent"
            >
              <Plus size={16} /> Add set
            </button>
            <button
              type="button"
              onClick={() => removeSet(blockIdx, block.sets.length - 1)}
              disabled={block.sets.length <= 1}
              className="flex h-10 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-accent disabled:opacity-40"
              aria-label="Remove last set"
            >
              <Minus size={16} />
            </button>
          </div>
        </>
      )}
    </section>
  )
}
