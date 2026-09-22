import { rankFor, type RankInfo } from './tiers'
import { standardFor, type Sex } from './standards'
import { rateSet } from './scoring'

export interface RankContext {
  sex: Sex
  bodyKg: number
}

interface DraftSet {
  weight: string
  reps: string
}

function parse(v: string): number | undefined {
  const n = Number(v.replace(',', '.'))
  return v.trim() !== '' && Number.isFinite(n) && n > 0 ? n : undefined
}

function rateDraft(exerciseId: string, s: DraftSet, ctx: RankContext): number {
  const std = standardFor(exerciseId)
  return std ? rateSet(std, { weight: parse(s.weight), reps: parse(s.reps) }, ctx.sex, ctx.bodyKg) : 0
}

/** The lift's rank including sets completed this session. */
export function liveRank(exerciseId: string, done: DraftSet[], historical: RankInfo | undefined, ctx: RankContext): RankInfo | undefined {
  const rating = Math.max(historical?.rating ?? 0, ...done.map(s => rateDraft(exerciseId, s, ctx)))
  return rating > 0 ? rankFor(rating) : undefined
}

/**
 * The rank a just-completed set reaches, when it climbs past the lift's best so far
 * (history plus earlier sets this session). Null when nothing changed.
 */
export function rankUpFromSet(
  exerciseId: string,
  set: DraftSet,
  otherDone: DraftSet[],
  historical: RankInfo | undefined,
  ctx: RankContext,
): { from: RankInfo | null; to: RankInfo } | null {
  const rating = rateDraft(exerciseId, set, ctx)
  if (rating <= 0) return null
  const before = Math.max(historical?.rating ?? 0, ...otherDone.map(s => rateDraft(exerciseId, s, ctx)))
  const from = before > 0 ? rankFor(before) : null
  const to = rankFor(rating)
  return !from || to.step > from.step ? { from, to } : null
}
