import type { Recap } from './recap'

const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`

/** The period in one line, from what actually happened (the recap page and the share card). */
export function headline(r: Recap): string {
  if (r.empty) return `Nothing logged this ${r.period}.`
  const parts: string[] = []
  if (r.training.workouts > 0) parts.push(plural(r.training.workouts, 'workout'))
  if (r.bests.length > 0) parts.push(plural(r.bests.length, 'new best'))
  if (r.steps.total > 0) parts.push(`${r.steps.total.toLocaleString()} steps`)
  if (r.food) parts.push(`${plural(r.food.days, 'day')} of food logged`)
  if (parts.length === 0) return `A quiet ${r.period}.`
  return `${parts.slice(0, -1).join(', ')}${parts.length > 1 ? ' and ' : ''}${parts[parts.length - 1]}.`
}
