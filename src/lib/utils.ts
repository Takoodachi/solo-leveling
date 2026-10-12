import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** `n`, kept within [low, high]. */
export const clamp = (n: number, [low, high]: readonly [number, number]) => Math.min(high, Math.max(low, n))

/** A copy of `list` with the items at `i` and `j` in each other's place. */
export function swapped<T>(list: readonly T[], i: number, j: number): T[] {
  const next = [...list]
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

/** A copy of `list` with the item at `from` taken out and put in at `to`, the ones between moving over. */
export function moved<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list]
  next.splice(to, 0, ...next.splice(from, 1))
  return next
}
