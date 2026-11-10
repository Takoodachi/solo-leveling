import { describe, expect, it } from 'vitest'
import { SETTING_ENTRIES } from './searchIndex'
import { searchSettings, wordsMatch } from './settingsSearch'

const top = (q: string) => searchSettings(q, SETTING_ENTRIES).map(e => e.id)

describe('settings search', () => {
  it('finds a setting by its name', () => {
    expect(top('vibration')[0]).toBe('extra-haptics')
    expect(top('theme')[0]).toBe('theme')
    expect(top('rest timer')).toContain('rest')
  })

  it('finds a setting from a description of the change', () => {
    expect(top('how do I turn off the vibration')[0]).toBe('extra-haptics')
    expect(top('my phone keeps buzzing when I tick a set')[0]).toBe('extra-haptics')
    expect(top('my phone keeps buzzing')[0]).toBe('extra-haptics')
    expect(top('make the app darker')[0]).toBe('theme')
    expect(top('I want different colours')[0]).toBe('theme')
    expect(top('my calorie goal is wrong')[0]).toBe('targets')
    expect(top('stop the caffeine warning')[0]).toBe('extra-caffeine')
    expect(top('spotify instead of youtube music')[0]).toBe('music-app')
    expect(top('put a picture behind everything')[0]).toBe('background-photo')
  })

  it('finds both weekly things that pop up on Home', () => {
    const ids = top('I don’t want the weekly popup on monday')
    expect(ids.slice(0, 2).sort()).toEqual(['extra-checkIn', 'extra-recapBanner'])
    expect(top('weekly recalculation of my targets')[0]).toBe('extra-checkIn')
  })

  it('finds something while the word is still being typed', () => {
    expect(top('vib')[0]).toBe('extra-haptics')
  })

  it('finds nothing for asking words alone or nonsense', () => {
    expect(top('how do I')).toEqual([])
    expect(top('zzqx')).toEqual([])
  })

  it('matches forms of a word, not unrelated words', () => {
    expect(wordsMatch('vibrating', 'vibration')).toBe(true)
    expect(wordsMatch('notify', 'notifications')).toBe(true)
    expect(wordsMatch('darker', 'dark')).toBe(true)
    expect(wordsMatch('settings', 'setup')).toBe(false)
    expect(wordsMatch('reminder', 'remove')).toBe(false)
  })
})
