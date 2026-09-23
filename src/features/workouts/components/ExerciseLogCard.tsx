import { Plus, Minus } from 'lucide-react'
import { toast } from 'sonner'
import { setModeFor } from '@/lib/workoutMath'
import { useWorkoutStore } from '../store'
import type { BlockDraft } from '../types'
import SetRow from './SetRow'
import { SET_COLUMNS, SET_GRID, type SetRowMode } from '../setColumns'
import BlockHeader from './BlockHeader'
import type { RankInfo } from '@/features/ranks/tiers'
import { liveRank, rankUpFromSet, type RankContext } from '@/features/ranks/liveRank'
import RankBadge from '@/features/ranks/components/RankBadge'

interface Props {
  block: BlockDraft
  blockIdx: number
  isFirst: boolean
  isLast: boolean
  onSetDone: (restSec: number) => void
  onShowInfo: () => void
  /** Best rank so far on this lift (from history), if it's a ranked lift. */
  liftRank?: RankInfo
  rankContext: RankContext | null
}

export default function ExerciseLogCard({ block, blockIdx, isFirst, isLast, onSetDone, onShowInfo, liftRank, rankContext }: Props) {
  const { addSet, removeSet, updateSet, toggleDone } = useWorkoutStore()
  // Cardio blocks render CardioLogCard; here it's weight × reps or timed sets.
  const mode: SetRowMode = setModeFor(block.exercise) === 'time' ? 'time' : 'load'
  const done = block.sets.filter(s => s.done).length
  const rank = rankContext ? liveRank(block.exercise.uuid, block.sets.filter(s => s.done), liftRank, rankContext) : liftRank

  function handleToggle(setIdx: number) {
    if (!toggleDone(blockIdx, setIdx)) return
    onSetDone(block.restSec)
    announceRankUp(setIdx)
  }

  function announceRankUp(setIdx: number) {
    if (!rankContext) return
    const others = block.sets.filter((s, i) => s.done && i !== setIdx)
    const up = rankUpFromSet(block.exercise.uuid, block.sets[setIdx], others, liftRank, rankContext)
    if (!up) return
    toast(up.from ? `Rank up! ${up.to.label}` : `Ranked ${up.to.label}`, {
      description: up.from ? `${block.exercise.name} · was ${up.from.label}` : block.exercise.name,
      icon: <RankBadge tier={up.to.tier.key} size={28} />,
    })
  }

  function copyLast(setIdx: number) {
    const last = block.lastSets?.[setIdx]
    if (!last) return
    if (last.weight != null) updateSet(blockIdx, setIdx, 'weight', String(last.weight))
    if (last.reps != null) updateSet(blockIdx, setIdx, 'reps', String(last.reps))
    if (last.duration != null) updateSet(blockIdx, setIdx, 'duration', String(last.duration))
    if (last.distanceKm != null) updateSet(blockIdx, setIdx, 'distanceKm', String(last.distanceKm))
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
            {done}/{block.sets.length} sets · rest {block.restSec}s
            {rank && (
              <span className="ml-1 inline-flex items-center gap-0.5 font-semibold" style={{ color: rank.tier.color }}>
                <RankBadge tier={rank.tier.key} size={18} /> {rank.label}
              </span>
            )}
          </>
        }
      />

      <div className="grid gap-2 px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground" style={{ gridTemplateColumns: SET_GRID[mode] }}>
        <span className="text-center">Set</span>
        <span>Previous</span>
        {SET_COLUMNS[mode].map(([field, label]) => <span key={field} className="text-center">{label}</span>)}
        <span className="text-center">✓</span>
      </div>

      <div className="flex flex-col gap-1">
        {block.sets.map((set, setIdx) => (
          <SetRow
            key={set.uuid}
            index={setIdx}
            set={set}
            mode={mode}
            last={block.lastSets?.[setIdx]}
            onChange={(field, value) => updateSet(blockIdx, setIdx, field, value)}
            onToggleDone={() => handleToggle(setIdx)}
            onUseLast={() => copyLast(setIdx)}
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
    </section>
  )
}
