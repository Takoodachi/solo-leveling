import { useEffect, useState } from 'react'
import { Check, Plus, Minus, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import type { WeightUnit } from '@/types'
import { est1RM, setModeFor } from '@/lib/workoutMath'
import { formatClock } from '@/lib/cardio'
import { cn } from '@/lib/utils'
import { useWorkoutStore } from '../store'
import type { BlockDraft } from '../types'
import SetRow from './SetRow'
import { SET_COLUMNS, SET_GRID, type SetRowMode } from '../setColumns'
import BlockCard, { type BlockCardProps } from './BlockCard'
import ProgressHint from './ProgressHint'
import EffortRow from './EffortRow'
import SetMenu from './SetMenu'
import { useSetOptions } from '../hooks/useSetOptions'
import { lastMain } from '../setKinds'
import PlatesButton from './PlatesButton'
import UnitToggle from './UnitToggle'
import { applyFill, isBarbell, suggestProgress } from '../progression'
import { orderEffect } from '../fatigue'
import { suggestStart, type RankedLift } from '../startWeight'
import { EFFORTS, type Effort } from '../effort'
import { autoRest, restForFailure } from '../autoRest'
import { prPace } from '../prPace'
import { DEFAULT_HOLD_SECONDS, lastSetsOf, setsInKg } from '../units'
import { restEndsAt, stopRest } from '../hooks/useRestTimer'
import { saveExerciseUnit } from '../hooks/useExerciseNote'
import { useHoldToMove } from '../hooks/useHoldToMove'
import type { RankInfo } from '@/features/ranks/tiers'
import { liveRank, rankUpFromSet, type RankContext } from '@/features/ranks/liveRank'
import RankBadge from '@/features/ranks/components/RankBadge'
import { ink } from '@/lib/colors'
import { buzz, tap } from '@/lib/haptics'
import { chime, unlockSound } from '@/lib/sound'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { extraOn } from '@/features/settings/extras'

/** When a hold of `seconds` starting now ends: read when ▶ is pressed, never while the card is drawn. */
const holdEndsAt = (seconds: number) => Date.now() + seconds * 1000

interface Props extends BlockCardProps {
  /** A set was ticked: the screen starts its rest (autoRest.ts). */
  onSetDone: (block: BlockDraft, setIdx: number) => void
  /** Best rank so far on this lift (from history), if it's a ranked lift. */
  liftRank?: RankInfo
  rankContext: RankContext | null
  /** Every ranked lift of the lifter's: a lift never logged takes its first weight from them (startWeight.ts). */
  lifts?: RankedLift[]
}

export default function ExerciseLogCard({ onSetDone, liftRank, rankContext, lifts, ...card }: Props) {
  const { block, blockIdx } = card
  const { addSet, removeSet, moveSet, updateSet, toggleDone, foldWhenDone, fillSets, setUnit, setEffort, draft } = useWorkoutStore()
  // Hold a set (anywhere but its fields and its tick) to carry it to another place in the exercise
  const { attach, handle, style, from } = useHoldToMove((from, to) => moveSet(blockIdx, from, to))
  const { settings } = useSettings()
  // Cardio blocks render CardioLogCard; here it's weight × reps, timed sets or a stretch's holds.
  const setMode = setModeFor(block.exercise)
  const mode: SetRowMode = setMode === 'time' || setMode === 'stretch' ? setMode : 'load'
  // A stretch's hold counting down on one of its sets (by id, so a set moved meanwhile keeps it)
  const [holding, setHolding] = useState<{ setId: string; endAt: number; total: number } | null>(null)
  const done = block.sets.filter(s => s.done).length
  // The fields hold the block's unit; ranks only know kg, and last time's sets are stored in it
  const kgSets = setsInKg(block.sets, block.unit)
  const lastSets = lastSetsOf(block)
  // Drop sets, rest-pause and partials never count toward a rank or a best (setKinds.ts)
  const rank = rankContext ? liveRank(block.exercise.uuid, kgSets.filter(s => s.done && !s.kind), liftRank, rankContext) : liftRank
  // Auto rest (Settings → Extras): the rest is picked from the movement and the set, not the routine's time
  const auto = extraOn('autoRest', settings?.extras)
  const autoPick = auto ? autoRest(block.exercise) : null
  // Tap a set's number: failure, a drop set, rest-pause or partials after it, or out (useSetOptions)
  const { numbers, menu, openMenu, carryOn } = useSetOptions(block, blockIdx, mode === 'load', auto)
  // "None" left is the last set's failure mark (an answer from before marks is the block's own)
  const lastSetFailed = !!block.sets[lastMain(block.sets)]?.failure
  const effort = lastSetFailed ? 'hard' : block.effort
  // No "what to try today" while correcting a workout that's already happened, or with tips switched off
  const tips = !draft?.editing && settings?.workoutTips !== false
  const hint = !tips
    ? null
    : (suggestProgress({ ...block, restSec: autoPick?.seconds ?? block.restSec, bodyKg: rankContext?.bodyKg, order: draft ? orderEffect(draft.blocks, blockIdx) : undefined })
      // Never logged: a first weight from the lifter's related lifts, until the first set is in
      ?? (!block.lastSets?.length && rankContext && lifts && done === 0 ? suggestStart({ ...block, ...rankContext, lifts }) : null))
  // Its last set was the latest ticked: ask how many reps that left (not while correcting a past workout)
  const asksEffort = !draft?.editing && draft?.justDone === block.exercise.uuid && mode === 'load' && done === block.sets.length
  const effortTag = EFFORTS.find(e => e.value === effort)?.tag
  const fill = hint?.fill
  const fillChanges = !!fill && applyFill(block.sets, fill).some((s, i) => s !== block.sets[i])
  // The plate calculator starts from the next set's weight
  const nextSet = block.sets.find(s => !s.done) ?? block.sets[block.sets.length - 1]
  // The live PR line under the next ordinary set: the reps at its weight for a new best or the next division (prPace.ts)
  const nextIdx = block.sets.findIndex(s => !s.done && !s.kind)
  const pace = tips && mode === 'load' && nextIdx >= 0
    ? prPace({
        exerciseId: block.exercise.uuid,
        kg: Number(kgSets[nextIdx].weight) || 0,
        planned: Number(block.sets[nextIdx].reps) || block.lastSets?.[nextIdx]?.reps || block.targetReps,
        best: kgSets.reduce((best, s) => (s.done && !s.kind ? Math.max(best, est1RM(Number(s.weight) || 0, Number(s.reps) || 0)) : best), block.best ?? 0),
        rank,
        ctx: rankContext,
        assisted: /assisted/i.test(block.exercise.name),
      })
    : null

  function handleToggle(setIdx: number) {
    if (holding && block.sets[setIdx]?.uuid === holding.setId) setHolding(null) // ticked by hand: that hold is over
    if (!toggleDone(blockIdx, setIdx)) return
    tap()
    onSetDone(block, setIdx)
    announceRankUp(setIdx)
    foldWhenDone(blockIdx) // the last one: the card gets out of the way of the next exercise
  }

  // A stretch's hold: ▶ counts the set's seconds down and ticks it at the end, so nothing has to be
  // watched or touched mid-stretch. Stopping it logs nothing.
  function toggleHold(setIdx: number) {
    const set = block.sets[setIdx]
    if (holding?.setId === set.uuid) return setHolding(null)
    let seconds = Number(set.duration)
    if (!(seconds > 0)) {
      seconds = DEFAULT_HOLD_SECONDS
      updateSet(blockIdx, setIdx, 'duration', String(seconds))
    }
    if (restEndsAt()) stopRest() // in place for the next hold: the rest is over
    tap()
    unlockSound() // from this tap, so the end of the hold can be heard
    setHolding({ setId: set.uuid, endAt: holdEndsAt(seconds), total: seconds })
  }

  // "None" left is a set to failure: Auto rest adds its 30 s to the rest running (and takes them back with it).
  // Not after a drop set or the like, whose rest is already the one after failure (autoRest.ts)
  function pickEffort(answer: Effort) {
    setEffort(blockIdx, answer)
    const failure = answer === 'hard' && !lastSetFailed // the same answer again takes it back
    if (failure !== lastSetFailed && !block.sets.at(-1)?.kind) restForFailure(block.exercise, failure, auto)
  }

  function announceRankUp(setIdx: number) {
    if (!rankContext || block.sets[setIdx]?.kind) return
    const others = kgSets.filter((s, i) => s.done && i !== setIdx && !s.kind)
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

  // The hold's end: tick its set, as the ✓ would, and buzz. Set again after every draw, so it acts on the card as it is
  useEffect(() => {
    if (!holding) return
    const timer = setTimeout(() => {
      setHolding(null)
      // The set as it is now: ticked by hand meanwhile, or gone, and there's nothing to do
      const now = useWorkoutStore.getState().draft?.blocks[blockIdx]
      const setIdx = now?.exercise.uuid === block.exercise.uuid ? now.sets.findIndex(s => s.uuid === holding.setId) : -1
      if (setIdx < 0 || now?.sets[setIdx].done) return
      handleToggle(setIdx)
      buzz([200, 100, 200]) // after the tick's own tap, which a vibration would cut short
      chime() // for a phone out of sight while stretching
    }, Math.max(0, holding.endAt - Date.now()))
    return () => clearTimeout(timer)
  })

  return (
    <BlockCard
      {...card}
      footer={asksEffort ? <EffortRow value={effort} onPick={pickEffort} onCarryOn={kind => carryOn(lastMain(block.sets), kind)} /> : undefined}
      subtitle={
        <>
          {done === block.sets.length && <Check size={12} strokeWidth={3.5} className="text-primary" aria-label="All sets done" />}
          {done}/{block.sets.length} sets{(mode !== 'stretch' || block.restSec > 0) && <> · rest {autoPick ? `${formatClock(autoPick.seconds / 60)} auto` : `${block.restSec}s`}</>}
          {effortTag && !asksEffort && <> · {effortTag}</>}
          {rank && (
            <span className="inline-flex items-center gap-0.5 font-semibold" style={{ color: ink(rank.tier.color) }}>
              <RankBadge tier={rank.tier.key} size={18} /> {rank.label}
            </span>
          )}
        </>
      }
    >
      {hint && <ProgressHint hint={hint} onUse={fill && fillChanges ? () => fillSets(blockIdx, fill) : undefined} />}

      <div className="grid items-center gap-2 px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground" style={{ gridTemplateColumns: SET_GRID[mode] }}>
        <span className="text-center">Set</span>
        <span>Previous</span>
        {SET_COLUMNS[mode].map(([field, label]) => (
          field === 'weight'
            ? <UnitToggle key={field} unit={block.unit} onChange={changeUnit} />
            : <span key={field} className="text-center">{label}</span>
        ))}
        {mode === 'stretch' && <span />}
        <span className="text-center">✓</span>
      </div>

      <div ref={attach} className="relative flex flex-col gap-1">
        {block.sets.map((set, setIdx) => (
          <div
            key={set.uuid}
            {...handle(setIdx)}
            style={style(setIdx)}
            className={cn('rounded-2xl', from === setIdx && 'wallpaper-solid bg-card shadow-lg ring-1 ring-primary/50')}
          >
            <SetRow
              number={numbers[setIdx]}
              set={set}
              mode={mode}
              unit={block.unit}
              last={lastSets?.[setIdx]}
              onChange={(field, value) => updateSet(blockIdx, setIdx, field, value)}
              onToggleDone={() => handleToggle(setIdx)}
              onUseLast={() => copyLast(setIdx)}
              onMenu={openMenu && (() => openMenu(setIdx))}
              hold={holding?.setId === set.uuid ? holding : null}
              onHold={mode === 'stretch' && !draft?.editing ? () => toggleHold(setIdx) : undefined}
            />
            {pace && setIdx === nextIdx && (
              <p className="flex items-center gap-1.5 px-2 pb-1 pt-0.5 text-xs font-semibold text-primary">
                <Trophy size={13} aria-hidden="true" />{pace}
              </p>
            )}
          </div>
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
        {mode === 'load' && isBarbell(block.exercise.name) && <PlatesButton unit={block.unit ?? 'kg'} weight={nextSet?.weight ?? ''} />}
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
      <SetMenu {...menu} />
    </BlockCard>
  )
}
