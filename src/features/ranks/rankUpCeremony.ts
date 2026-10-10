import type { CSSProperties } from 'react'
import { rankUpXp, type RankUp } from './computeRanks'

/**
 * The full-screen rank-up sequence (RankUpCeremony): which rank-ups get a scene, in what order,
 * and how each scene is timed. A new tier swaps the old helmet for the new one; a division inside
 * the same tier keeps the helmet and is shorter; a lift's first rank wakes a greyed-out one.
 */
export type CeremonyKind = 'first' | 'division' | 'tier'

export function ceremonyKind(up: RankUp): CeremonyKind {
  if (!up.from) return 'first'
  return up.from.tier.key === up.to.tier.key ? 'division' : 'tier'
}

/** A scene each for the overall rank and at most this many others; the rest are in the summary's list. */
const MAX_OTHERS = 3
const WEIGHT: Record<CeremonyKind, number> = { first: 0, division: 1, tier: 2 }

/** The scenes to play, smallest first, building up to the overall rank. */
export function ceremonyQueue(ups: RankUp[]): RankUp[] {
  const overall = ups.filter(u => u.id === 'overall')
  const others = ups
    .filter(u => u.id !== 'overall')
    .sort((a, b) => WEIGHT[ceremonyKind(b)] - WEIGHT[ceremonyKind(a)] || b.to.step - a.to.step)
    .slice(0, MAX_OTHERS)
    .reverse()
  return [...others, ...overall]
}

/** Moments inside a scene, in seconds from its start. */
export interface SceneTiming {
  /** The ring starts to fill and the emblem starts to shake. */
  charge: number
  /** The flash: the new rank lands. */
  burst: number
  /** The scene is over. */
  end: number
}

export function sceneTiming(up: RankUp): SceneTiming {
  const big = ceremonyKind(up) !== 'division'
  const burst = big ? 1.55 : 1.15
  return { charge: 0.35, burst, end: burst + (up.id === 'overall' ? 2.5 : 2.0) }
}

/** What the scene is called: "New tier", "Rank up" or "First rank". */
export const KIND_LABEL: Record<CeremonyKind, string> = { first: 'First rank', division: 'Rank up', tier: 'New tier' }

export const sceneSubject = (up: RankUp) => (up.id === 'overall' ? 'Overall rank' : up.name)

/** XP this one rank-up was worth (a lift's first rank earns none). */
export const sceneXp = (up: RankUp) => rankUpXp([up])

/** A tier colour at part strength, for glows and fills. */
export const tint = (color: string, percent: number) => `color-mix(in srgb, ${color} ${percent}%, transparent)`

/**
 * A square of `size` centred in its (relative) parent. With margins, never a translate:
 * framer-motion owns `transform` on whatever it animates.
 */
export const centered = (size: number): CSSProperties => ({
  position: 'absolute',
  left: '50%',
  top: '50%',
  width: size,
  height: size,
  marginLeft: -size / 2,
  marginTop: -size / 2,
})
