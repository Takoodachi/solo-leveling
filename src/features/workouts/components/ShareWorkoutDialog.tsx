import { useCallback, useMemo } from 'react'
import type { WeightUnit, WorkoutWithSets } from '@/types'
import { useUnits } from '@/features/settings/units'
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
  /** The unit each exercise's sets read in (useExerciseUnits). */
  unitOf: (exerciseId: string) => WeightUnit
}

/** A workout's summary as a picture to send (any workout: just finished, or from history). */
export default function ShareWorkoutDialog({ open, onOpenChange, workout, bests, rankUps, unitOf }: Props) {
  const { name, avatar } = useCardOwner()
  const unit = useUnits(s => s.weight)
  const share = useMemo(() => ({ workout, bests, rankUps, unitOf, unit }), [workout, bests, rankUps, unitOf, unit])
  const make = useCallback(() => renderWorkoutCard(share, { name, avatar }), [share, name, avatar])
  const title = workout.name?.trim() || 'Workout'
  const line = workoutHeadline(share)

  return (
    <ShareImageDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Share this workout"
      description="The summary as a picture, with your name and photo. Notes, heart rate and calories stay off it."
      make={make}
      fileName={`solo-leveling-workout-${workout.date}.png`}
      text={`${title}: ${line}`}
      alt={`Workout summary: ${title}, ${line}`}
    />
  )
}
