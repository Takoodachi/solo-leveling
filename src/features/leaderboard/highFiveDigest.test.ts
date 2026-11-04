import { describe, expect, it } from 'vitest'
import type { Highlight } from './types'
import { joinNames } from './highFives'
import { highFiveNews } from './highFiveDigest'

const mine: Highlight[] = [
  { kind: 'lift', name: 'Barbell Bench Press', rating: 500, detail: '100 kg × 5', date: '2026-11-02' },
  { kind: 'run', name: 'Running', rating: 600, detail: '10 km in 50:00', date: '2026-11-01' },
]
const bench = 'lift:Barbell Bench Press:2026-11-02'
const run = 'run:Running:2026-11-01'
const names = new Map([['a', 'Alex'], ['s', 'Sam']])
const at = '2026-11-03T10:00:00.123456+00:00'
const five = (from: string, key: string, to = 'me') => ({ from, to, key, at })
const news = (rows: ReturnType<typeof five>[], seen = 0) => highFiveNews(rows, 'me', seen, mine, names)

describe('highFiveNews', () => {
  it('says who high-fived what', () => {
    expect(news([five('a', bench)])).toBe('Alex high-fived your Barbell Bench Press best')
    expect(news([five('a', bench), five('s', bench)])).toBe('Alex and Sam high-fived your Barbell Bench Press best')
    expect(news([five('a', run)])).toBe('Alex high-fived your run')
    expect(news([five('a', bench), five('a', run)])).toBe('Alex high-fived 2 of your bests')
  })

  it('stays quiet about what was seen, someone else’s, a key matching nothing of yours, or a sender not on the board', () => {
    expect(news([five('a', bench)], Date.parse(at))).toBeNull()
    expect(news([five('a', bench, 'someone')])).toBeNull()
    expect(news([five('a', 'lift:Anything you like:2026-11-02')])).toBeNull()
    expect(news([five('x', bench)])).toBeNull()
  })
})

describe('joinNames', () => {
  it('names two and counts the rest', () => {
    expect(joinNames(['Alex'])).toBe('Alex')
    expect(joinNames(['Alex', 'Sam', 'Kim', 'Lee'])).toBe('Alex, Sam and 2 more')
  })
})
