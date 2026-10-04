import type { Recap } from './recap'

const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`

/**
 * The period in one line, from what actually happened. `shared` is the one that leaves the
 * phone (the share card and the text sent with it): food stays out of it.
 */
export function headline(r: Recap, { shared = false } = {}): string {
  if (r.empty) return `Nothing logged this ${r.period}.`
  const parts: string[] = []
  if (r.training.workouts > 0) parts.push(plural(r.training.workouts, 'workout'))
  if (r.bests.length > 0) parts.push(plural(r.bests.length, 'new best'))
  if (r.steps.total > 0) parts.push(`${r.steps.total.toLocaleString()} steps`)
  if (r.food && !shared) parts.push(`${plural(r.food.days, 'day')} of food logged`)
  if (parts.length === 0) return `A quiet ${r.period}.`
  return `${parts.slice(0, -1).join(', ')}${parts.length > 1 ? ' and ' : ''}${parts[parts.length - 1]}.`
}
