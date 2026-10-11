import type { Exercise, WorkoutSet } from '@/types'
import type { MuscleRegion } from '@/features/ranks/standards'

/**
 * Which muscles a workout worked and how much, for the body map on its summary. Unlike the
 * weekly set volume (analytics/volume.ts, which follows RP's counting rules), this is only
 * "what did today touch": every muscle an exercise names counts, helpers at half.
 */

/** The muscle names in the exercise data, on the bodygraph's regions. */
const NAME_TO_REGIONS: Record<string, readonly MuscleRegion[]> = {
  Chest: ['chest'], 'Upper Chest': ['chest'], 'Lower Chest': ['chest'],
  'Anterior Deltoid': ['front-delts'], 'Lateral Deltoid': ['side-delts'], 'Rear Deltoid': ['rear-delts'],
  Shoulders: ['front-delts', 'side-delts', 'rear-delts'], 'Rotator Cuff': ['rear-delts'],
  Triceps: ['triceps'], Biceps: ['biceps'], Brachialis: ['biceps'], Forearms: ['forearms'], Arms: ['biceps', 'triceps'],
  Abs: ['abs'], Obliques: ['obliques'], 'Transverse Abdominis': ['abs'], Core: ['abs', 'obliques'],
  Quadriceps: ['quads'], Hamstrings: ['hamstrings'], Glutes: ['glutes'], Calves: ['calves'],
  Adductors: ['adductors'], Abductors: ['abductors'], Legs: ['quads', 'hamstrings', 'glutes'],
  Lats: ['lats'], Rhomboids: ['upper-back'], 'Middle Back': ['upper-back'], 'Upper Back': ['upper-back'], Back: ['lats', 'upper-back'],
  Traps: ['traps'], 'Lower Back': ['lower-back'],
}

/** Custom exercises carry only a category. */
const CATEGORY_TO_REGIONS: Record<string, readonly MuscleRegion[]> = {
  Chest: ['chest'], Back: ['lats', 'upper-back'], Shoulders: ['front-delts', 'side-delts', 'rear-delts'],
  Arms: ['biceps', 'triceps'], 'Lower Body': ['quads', 'hamstrings', 'glutes'], Core: ['abs', 'obliques'],
}

const SECONDARY_SHARE = 0.5
/** Cardio is one entry however long it was: every ten minutes weighs like a set, within reason. */
const CARDIO_MINUTES_PER_SET = 10
const CARDIO_MAX_SETS = 6

/** What one logged set (or cardio entry) of this exercise adds to each muscle. */
function sharesOf(exercise: Exercise): Map<MuscleRegion, number> {
  const shares = new Map<MuscleRegion, number>()
  const add = (names: readonly string[] | undefined, share: number) => {
    for (const name of names ?? []) {
      for (const region of NAME_TO_REGIONS[name] ?? []) shares.set(region, Math.max(shares.get(region) ?? 0, share))
    }
  }
  // Nearly every compound lift lists the core as a helper (bracing): as on the volume radar, that isn't core work
  add(exercise.musclesSecondary?.filter(name => name !== 'Core'), SECONDARY_SHARE)
  add(exercise.muscles, 1)
  if (shares.size === 0) for (const region of CATEGORY_TO_REGIONS[exercise.category] ?? []) shares.set(region, 1)
  return shares
}

/** Set-equivalents per muscle region for these sets; regions nothing touched are left out. */
export function musclesWorked(sets: (Pick<WorkoutSet, 'duration'> & { exercise: Exercise })[]): Map<MuscleRegion, number> {
  const work = new Map<MuscleRegion, number>()
  for (const s of sets) {
    const weight = s.exercise.type === 'cardio'
      ? Math.min(CARDIO_MAX_SETS, Math.max(1, (s.duration ?? 0) / CARDIO_MINUTES_PER_SET))
      : 1
    for (const [region, share] of sharesOf(s.exercise)) work.set(region, (work.get(region) ?? 0) + share * weight)
  }
  return work
}
