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

  it('reminds to stretch every day by default, opening the stretching routine, and not once stretched', () => {
    const stretch = reminderPrefs({ reminders: { stretch: { on: true, time: '20:30' } } } as Partial<Settings> as Settings)
    const days = (plan: ReturnType<typeof planReminders>) => plan.filter(p => p.kind === 'stretch').map(p => p.key)
    expect(days(planReminders(stretch, facts, morning, 3))).toEqual(['stretch-2026-11-02', 'stretch-2026-11-03', 'stretch-2026-11-04'])
    expect(days(planReminders(stretch, { ...facts, done: { stretch: true } }, morning, 2))).toEqual(['stretch-2026-11-03'])
    const mine = planReminders(stretch, { ...facts, stretchRoutine: { id: 'r1', name: 'Evening Stretch' } }, morning, 1)[0]
    expect(mine).toMatchObject({ url: '/workouts/routine/r1', body: 'Evening Stretch. Tap to start.' })
    expect(planReminders(stretch, facts, morning, 1)[0].url).toBe('/workouts?category=stretching')
    // On the days you train only: not on a day without a routine, nor on a skipped one
    const trainDays = reminderPrefs({ reminders: { stretch: { on: true, time: '20:30', days: 'workout-days' } } } as Partial<Settings> as Settings)
    expect(days(planReminders(trainDays, { ...facts, skipped: ['2026-11-04'] }, morning, 10))).toEqual(['stretch-2026-11-02', 'stretch-2026-11-09', 'stretch-2026-11-11'])
  })

  it('leaves out workout and stretching nudges while training is paused, and nothing else', () => {
    const many = reminderPrefs({
      reminders: {
        workout: { on: true, time: '17:30', days: 'daily' },
        stretch: { on: true, time: '20:30' },
        creatine: { on: true, time: '09:00' },
        food: { on: true, time: '20:00' },
      },
    } as Partial<Settings> as Settings)
    const plan = planReminders(many, { ...facts, paused: ['2026-11-02', '2026-11-03'] }, morning, 3)
    expect(plan.map(p => p.key)).toEqual([
      'creatine-2026-11-02', 'food-2026-11-02',
      'creatine-2026-11-03', 'food-2026-11-03',
      // The pause is over: everything comes back
      'creatine-2026-11-04', 'workout-2026-11-04', 'food-2026-11-04', 'stretch-2026-11-04',
    ])
  })

  it('announces the recap on Mondays only, and nothing already past', () => {
    const recaps = planReminders(prefs, facts, morning, 14).filter(p => p.kind === 'recap').map(p => p.key)
    expect(recaps).toEqual(['recap-2026-11-02', 'recap-2026-11-09'])
    const evening = new Date(2026, 10, 2, 20, 0)
    expect(planReminders(prefs, facts, evening, 1)).toEqual([])
  })
})
