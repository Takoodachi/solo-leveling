export type TierKey = 'wood' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'champion' | 'titan' | 'olympian'

export interface Tier {
  key: TierKey
  name: string
  /** Lowest strength rating in this tier (ranks are floors). */
  min: number
  /** Label/accent color, tuned for the dark theme. */
  color: string
}

export const TIERS: readonly Tier[] = [
  { key: 'wood',     name: 'Wood',     min: 1,   color: '#d08e52' },
  { key: 'bronze',   name: 'Bronze',   min: 200, color: '#e0a07a' },
  { key: 'silver',   name: 'Silver',   min: 300, color: '#d3dae4' },
  { key: 'gold',     name: 'Gold',     min: 400, color: '#f5c84c' },
  { key: 'platinum', name: 'Platinum', min: 500, color: '#62e3c4' },
  { key: 'diamond',  name: 'Diamond',  min: 600, color: '#9199ff' },
  { key: 'champion', name: 'Champion', min: 700, color: '#d68bff' },
  { key: 'titan',    name: 'Titan',    min: 800, color: '#f2555d' },
  { key: 'olympian', name: 'Olympian', min: 900, color: '#6fd0ff' },
]

export const MAX_RATING = 1000
const DIVISIONS = ['III', 'II', 'I'] as const
/** 8 tiers × 3 divisions, then Olympian (no divisions). */
export const TOP_STEP = (TIERS.length - 1) * DIVISIONS.length

export interface RankInfo {
  rating: number
  tier: Tier
  division: (typeof DIVISIONS)[number] | null
  /** Position on the 25-step ladder (Wood III = 0 … Olympian = 24). Compare these for rank-ups. */
  step: number
  label: string
  /** Rating where the next division starts, or null at Olympian. */
  nextAt: number | null
  nextLabel: string | null
  /** 0–1 progress through the current division. */
  progress: number
}

/** First rating of a ladder step. */
function stepStart(step: number): number {
  if (step >= TOP_STEP) return TIERS[TIERS.length - 1].min
  const tier = Math.floor(step / 3)
  const lo = tier === 0 ? 0 : TIERS[tier].min
  const hi = TIERS[tier + 1].min
  return Math.round(lo + ((hi - lo) * (step % 3)) / 3)
}

function stepLabel(step: number): string {
  if (step >= TOP_STEP) return TIERS[TIERS.length - 1].name
  return `${TIERS[Math.floor(step / 3)].name} ${DIVISIONS[step % 3]}`
}

export function rankFor(rawRating: number): RankInfo {
  const rating = Math.min(MAX_RATING, Math.max(1, Math.round(rawRating)))
  let step = 0
  while (step < TOP_STEP && rating >= stepStart(step + 1)) step++

  const top = step >= TOP_STEP
  const start = stepStart(step)
  const nextAt = top ? null : stepStart(step + 1)
  return {
    rating,
    tier: TIERS[Math.min(Math.floor(step / 3), TIERS.length - 1)],
    division: top ? null : DIVISIONS[step % 3],
    step,
    label: stepLabel(step),
    nextAt,
    nextLabel: top ? null : stepLabel(step + 1),
    progress: nextAt == null ? (rating - start) / (MAX_RATING - start) : (rating - start) / (nextAt - start),
  }
}
