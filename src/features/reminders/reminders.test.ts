import { describe, expect, it } from 'vitest'
import type { Settings } from '@/types'
import { planReminders, reminderPrefs } from './reminders'

const prefs = reminderPrefs({
  reminders: { workout: { on: true, time: '17:30', days: 'workout-days' }, recap: { on: true, time: '09:00' } },
} as Partial<Settings> as Settings)
const facts = { done: {}, routines: { 1: 'Push Day', 3: 'Push Day' } }
const morning = new Date(2026, 10, 2, 8, 0) // Monday 8:00
const workoutDays = (plan: ReturnType<typeof planReminders>) => plan.filter(p => p.kind === 'workout').map(p => p.key)

describe('planReminders', () => {
  it('nudges on days with a routine, named after it', () => {
    const plan = planReminders(prefs, facts, morning, 10)
    expect(workoutDays(plan)).toEqual(['workout-2026-11-02', 'workout-2026-11-04', 'workout-2026-11-09', 'workout-2026-11-11'])
    expect(plan.find(p => p.kind === 'workout')?.title).toBe('Push Day today')
  })

  it('leaves out skipped days, and today once it is done', () => {
    expect(workoutDays(planReminders(prefs, { ...facts, skipped: ['2026-11-04'] }, morning, 10))).toEqual(['workout-2026-11-02', 'workout-2026-11-09', 'workout-2026-11-11'])
    expect(workoutDays(planReminders(prefs, { ...facts, done: { workout: true } }, morning, 10))[0]).toBe('workout-2026-11-04')
  })

  it('announces the recap on Mondays only, and nothing already past', () => {
    const recaps = planReminders(prefs, facts, morning, 14).filter(p => p.kind === 'recap').map(p => p.key)
    expect(recaps).toEqual(['recap-2026-11-02', 'recap-2026-11-09'])
    const evening = new Date(2026, 10, 2, 20, 0)
    expect(planReminders(prefs, facts, evening, 1)).toEqual([])
  })
})
