import { describe, expect, it } from 'vitest'
import { daysBefore } from '@/test/db'
import { GREETINGS, greetingFor } from './greetings'

const days = Array.from({ length: 730 }, (_, i) => daysBefore('2027-12-31', 729 - i))

describe('greetingFor', () => {
  it('never shows the same greeting two days running', () => {
    const texts = days.map(day => greetingFor(day, 'Luong').text)
    expect(texts.filter((text, i) => i > 0 && text === texts[i - 1])).toEqual([])
  })

  it('brings every greeting once in each round', () => {
    const fromEpoch = days.slice(days.indexOf('2026-01-01'))
    for (let start = 0; start + GREETINGS.length <= fromEpoch.length; start += GREETINGS.length) {
      const round = fromEpoch.slice(start, start + GREETINGS.length).map(day => greetingFor(day, 'Luong').text)
      expect(new Set(round).size).toBe(GREETINGS.length)
    }
  })

  it('reads cleanly without a name', () => {
    for (const day of days.slice(0, GREETINGS.length * 2)) {
      expect(greetingFor(day, '').text).not.toMatch(/\{name\}|,\s*[?…]?$|,\?|,…/)
    }
  })
})
