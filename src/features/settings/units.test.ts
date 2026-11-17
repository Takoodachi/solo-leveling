import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db'
import { resetDb } from '@/test/db'
import { formatVolume } from '@/lib/workoutMath'
import { achievementDef, describeAchievement, progressLabel } from '@/features/gamification/achievements'
import { exerciseUnit, saveExerciseUnit } from '@/features/workouts/hooks/useExerciseNote'
import { EMPTY_SETUP, finishSetup, heightOf, savedSetup, weightOf, withUnits } from '@/features/setup/setup'
import { bodyKg, bodyText, cmFrom, feetInches, heightText, liftText, useUnits, weeklyChange } from './units'

// Settings → Units: weights are kept in kg and heights in cm, and only shown and typed in the account's units
describe('showing and typing in the account’s units', () => {
  it('writes heights in cm or feet and inches, and every inch comes back as itself', () => {
    expect(feetInches(178)).toEqual({ ft: 5, in: 10 })
    expect(heightText(178, 'ftin')).toBe('5 ft 10 in')
    expect(heightText(178, 'cm')).toBe('178 cm')
    for (let inches = 48; inches <= 96; inches++) {
      const { ft, in: rest } = feetInches(cmFrom(Math.floor(inches / 12), inches % 12))
      expect(ft * 12 + rest).toBe(inches)
    }
  })

  it('writes body weight to a tenth, lifts as they were typed, and stores pounds to the hundredth of a kilo', () => {
    expect(bodyText(80, 'lb')).toBe('176.4 lb')
    expect(bodyText(80, 'kg')).toBe('80 kg')
    expect(bodyKg(176.4, 'lb')).toBe(80.01)
    expect(liftText(61.23, 'lb')).toBe('135 lb')
    expect(weeklyChange(-0.2, 'lb')).toBe('−0.4 lb a week')
    expect(formatVolume(4000, 'lb')).toBe('8,818 lb')
    expect(formatVolume(5000, 'lb')).toBe('11.0k lb')
    expect(formatVolume(5000, 'kg')).toBe('5,000 kg')
  })

  it('counts the tonnes achievements in pounds on an lb account', () => {
    const def = achievementDef('volume_10t')
    if (!def) throw new Error('volume_10t is gone')
    expect(describeAchievement(def, 'lb')).toBe('Lift 22,046 lb in total')
    expect(progressLabel(def, 3.4, 'lb')).toBe('7,495 / 22,046 lb')
    expect(describeAchievement(def, 'kg')).toBe(def.description)
    expect(progressLabel(def, 3.4, 'kg')).toBe('3.4 / 10 tonnes')
  })
})

describe('a lift’s own unit', () => {
  beforeEach(async () => {
    await resetDb()
    useUnits.setState({ weight: 'kg', height: 'cm' })
  })

  it('follows the account until it’s switched on its card, and keeps one only to differ', async () => {
    useUnits.setState({ weight: 'lb' })
    expect(await exerciseUnit('ex-bench')).toBe('lb')
    await saveExerciseUnit('ex-bench', 'kg')
    expect(await exerciseUnit('ex-bench')).toBe('kg')
    await saveExerciseUnit('ex-bench', 'lb') // back to the account's: nothing of its own
    expect((await db.exerciseNotes.get('note-ex-bench'))?.unit).toBeUndefined()
    useUnits.setState({ weight: 'kg' })
    expect(await exerciseUnit('ex-bench')).toBe('kg')
  })
})

describe('the setup questions in other units', () => {
  beforeEach(resetDb)

  it('reads feet and inches, and converts what was typed when a unit is switched', () => {
    const ftIn = { ...EMPTY_SETUP, units: { weight: 'kg' as const, height: 'ftin' as const }, heightFt: '5', heightIn: '10', weight: '80' }
    expect(heightOf(ftIn)).toBe(178)
    const switched = { ...ftIn, ...withUnits(ftIn, { weight: 'lb', height: 'cm' }) }
    expect(switched).toMatchObject({ heightCm: '178', weight: '176.4' })
    expect(weightOf(switched)).toBe(80.01)
  })

  it('doesn’t log the weight on record again when it was only shown in pounds', async () => {
    await db.bodyMetrics.put({ uuid: 'weight-2026-11-01', date: '2026-11-01', weightKg: 80, updatedAt: 1 })
    const form = await savedSetup()
    await finishSetup({ ...form, ...withUnits(form, { weight: 'lb', height: 'ftin' }) }, true)
    expect(await db.bodyMetrics.count()).toBe(1)
    expect(await db.settings.get(1)).toMatchObject({ weightUnit: 'lb', heightUnit: 'ftin' })
    await finishSetup({ ...(await savedSetup()), weight: '180' }, true)
    expect((await db.bodyMetrics.toArray()).map(m => m.weightKg).sort()).toEqual([80, 81.65])
  })
})
