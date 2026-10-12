import { useCallback, useMemo } from 'react'
import type { WorkoutWithSets } from '@/types'
import type { RankUp } from '@/features/ranks/computeRanks'
import ShareImageDialog from '@/features/share/ShareImageDialog'
import { useCardOwner } from '@/features/share/useCardOwner'
import type { NewBest } from '../hooks/useWorkoutHistory'
import { renderWorkoutCard, workoutHeadline } from '../shareCard'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  workout: WorkoutWithSets
  bests: NewBest[]
  rankUps: RankUp[]
  /** Exercises logged in pounds. */
  lb: ReadonlySet<string>
}

/** A workout's summary as a picture to send (any workout: just finished, or from history). */
export default function ShareWorkoutDialog({ open, onOpenChange, workout, bests, rankUps, lb }: Props) {
  const { name, avatar } = useCardOwner()
  // The pound set is a new object every render: key it, or the card would be drawn again each time
  const lbKey = [...lb].sort().join(',')
  const lbIds = useMemo(() => new Set(lbKey ? lbKey.split(',') : []), [lbKey])
  const share = useMemo(() => ({ workout, bests, rankUps, lb: lbIds }), [workout, bests, rankUps, lbIds])
  const make = useCallback(() => renderWorkoutCard(share, { name, avatar }), [share, name, avatar])
  const title = workout.name?.trim() || 'Workout'
  const line = workoutHeadline(share)

  return (
    <ShareImageDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Share this workout"
      description="Exercises, sets, time, new bests and rank-ups. Notes and heart rate stay private."
      make={make}
      fileName={`solo-leveling-workout-${workout.date}.png`}
      text={`${title}: ${line}`}
      alt={`Workout card: ${title}, ${line}`}
    />
  )
}
