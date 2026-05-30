import { db } from '@/db'
import type { PrMetric, PrRecord, WorkoutSet } from '@/types'

export interface DetectedPr {
  exerciseId: string
  exerciseName: string
  metric: PrMetric
  value: number
  prevValue?: number
}

function epley1RM(weight: number, reps: number): number {
  return weight * (1 + reps / 30)
}

interface MetricResult {
  metric: PrMetric
  value: number
}

function bestForExerciseSets(sets: WorkoutSet[]): MetricResult[] {
  let maxWeight = -Infinity
  let max1RM = -Infinity
  let maxVolume = -Infinity

  for (const s of sets) {
    if (s.weight == null || s.weight <= 0) continue
    if (s.weight > maxWeight) maxWeight = s.weight
    if (s.reps != null && s.reps > 0) {
      const e = epley1RM(s.weight, s.reps)
      if (e > max1RM) max1RM = e
      const v = s.weight * s.reps
      if (v > maxVolume) maxVolume = v
    }
  }

  const out: MetricResult[] = []
  if (maxWeight > -Infinity) out.push({ metric: 'maxWeight', value: Math.round(maxWeight * 10) / 10 })
  if (max1RM > -Infinity) out.push({ metric: 'max1RM', value: Math.round(max1RM * 10) / 10 })
  if (maxVolume > -Infinity) out.push({ metric: 'maxVolume', value: Math.round(maxVolume * 10) / 10 })
  return out
}

/**
 * Compare the just-saved workout's sets (grouped by exercise) against history and write new PRs.
 * Returns the list of PRs that fired so the caller can surface them.
 */
export async function detectAndRecordPrs(savedSets: WorkoutSet[]): Promise<DetectedPr[]> {
  if (savedSets.length === 0) return []

  // Group sets by exercise
  const byExercise = new Map<string, WorkoutSet[]>()
  for (const s of savedSets) {
    const list = byExercise.get(s.exerciseId)
    if (list) list.push(s)
    else byExercise.set(s.exerciseId, [s])
  }

  const exerciseIds = [...byExercise.keys()]
  const exercises = await db.exercises.bulkGet(exerciseIds)
  const exerciseMap = new Map(exercises.flatMap(e => (e ? [[e.uuid, e]] : [])))

  const fired: DetectedPr[] = []
  const now = Date.now()
  const newRecords: PrRecord[] = []

  for (const [exerciseId, sets] of byExercise) {
    const results = bestForExerciseSets(sets)
    if (results.length === 0) continue

    const existing = await db.prRecords.where('exerciseId').equals(exerciseId).toArray()
    const bestByMetric = new Map<PrMetric, number>()
    for (const r of existing) {
      const cur = bestByMetric.get(r.metric)
      if (cur == null || r.value > cur) bestByMetric.set(r.metric, r.value)
    }

    for (const { metric, value } of results) {
      const prev = bestByMetric.get(metric)
      if (prev != null && value <= prev) continue
      newRecords.push({
        uuid: crypto.randomUUID(),
        exerciseId,
        metric,
        value,
        achievedAt: now,
        updatedAt: now,
        syncPending: true,
      })
      fired.push({
        exerciseId,
        exerciseName: exerciseMap.get(exerciseId)?.name ?? 'Exercise',
        metric,
        value,
        prevValue: prev,
      })
    }
  }

  if (newRecords.length > 0) {
    await db.prRecords.bulkAdd(newRecords)
  }

  return fired
}

export function formatPrLabel(pr: DetectedPr): string {
  switch (pr.metric) {
    case 'maxWeight':
      return `${pr.exerciseName} — ${pr.value} kg`
    case 'max1RM':
      return `${pr.exerciseName} — est. 1RM ${pr.value} kg`
    case 'maxVolume':
      return `${pr.exerciseName} — ${pr.value} kg volume`
    case 'maxReps':
      return `${pr.exerciseName} — ${pr.value} reps`
  }
}
