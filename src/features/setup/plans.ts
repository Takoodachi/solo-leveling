import { ROUTINE_TEMPLATES } from '@/data/routineTemplates'
import { copyTemplate, setDayRoutine } from '@/features/workouts/hooks/useRoutines'

export type StarterPlanId = 'full-body' | 'upper-lower' | 'mixed'

/** Plans made of the built-in templates, for someone without one: each training day takes the next template in turn. */
export const STARTER_PLANS: { id: StarterPlanId; name: string; hint: string; templates: string[] }[] = [
  { id: 'full-body', name: 'Full body', hint: 'The same full-body session each time: simple, and enough on its own', templates: ['tpl-full-body'] },
  { id: 'upper-lower', name: 'Upper / lower', hint: 'Upper body one day, legs and core the next', templates: ['tpl-upper-burn', 'tpl-legs-core'] },
  { id: 'mixed', name: 'Mix it up', hint: 'Full body, upper, legs and a cardio day, in turn', templates: ['tpl-full-body', 'tpl-upper-burn', 'tpl-legs-core', 'tpl-cardio-kick'] },
]

/** Training days spread over the week for `n` workouts (0 = Sunday). */
export function spreadDays(n: number): number[] {
  const byCount: Record<number, number[]> = { 1: [1], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6], 7: [1, 2, 3, 4, 5, 6, 0] }
  return byCount[Math.max(1, Math.min(7, Math.round(n)))]
}

/** Copy the plan's templates into the user's routines, each on its turn of `days` (one routine a day, as the plan keeps it). */
export async function startPlan(id: StarterPlanId, days: number[]): Promise<void> {
  const plan = STARTER_PLANS.find(p => p.id === id)
  if (!plan) return
  // Monday first, so the turns follow the week
  const week = [...new Set(days)].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
  for (const [turn, uuid] of plan.templates.entries()) {
    const own = week.filter((_, i) => i % plan.templates.length === turn)
    const template = ROUTINE_TEMPLATES.find(t => t.uuid === uuid)
    if (!template || own.length === 0) continue
    const routine = await copyTemplate(template)
    for (const day of own) await setDayRoutine(day, routine)
  }
}
