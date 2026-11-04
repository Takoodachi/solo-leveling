import type { WeightUnit } from '@/types'

/** The plates a gym usually has, heaviest first. */
export const PLATES: Record<WeightUnit, readonly number[]> = { kg: [25, 20, 15, 10, 5, 2.5, 1.25], lb: [45, 35, 25, 10, 5, 2.5] }

/** Bars to pick from: the usual Olympic bar first, then the lighter ones. */
export const BARS: Record<WeightUnit, readonly number[]> = { kg: [20, 15, 10], lb: [45, 35, 25] }

/**
 * What goes on each side of the bar for `total`, heaviest plate first (the way a bar is loaded),
 * and what that adds up to: the closest the plates get without going over.
 */
export function platesFor(total: number, bar: number, unit: WeightUnit): { perSide: number[]; loaded: number } {
  const perSide: number[] = []
  let left = (total - bar) / 2
  for (const plate of PLATES[unit]) {
    // The small tolerance keeps 61.23-style stored weights from losing a plate to float error
    while (left >= plate - 1e-6) {
      perSide.push(plate)
      left -= plate
    }
  }
  const loaded = bar + 2 * perSide.reduce((sum, p) => sum + p, 0)
  return { perSide, loaded: Math.round(loaded * 100) / 100 }
}
