import { describe, expect, it } from 'vitest'
import type { Settings } from '@/types'
import { DEFAULT_HOME_WIDGETS, homeWidgetsFrom, withCard } from './homeWidgets'

describe('Home cards', () => {
  it('leaves magnesium off a Home that hasn’t asked for it', () => {
    expect(homeWidgetsFrom(undefined)).not.toContain('magnesium')
    expect(homeWidgetsFrom({ homeWidgets: ['magnesium', 'workout'] } as Settings)).toEqual(['magnesium', 'workout'])
  })

  it('puts a card switched on after the one it usually follows: magnesium beside creatine', () => {
    const home = withCard(DEFAULT_HOME_WIDGETS, 'magnesium')
    expect(home.slice(home.indexOf('creatine'), home.indexOf('creatine') + 3)).toEqual(['creatine', 'magnesium', 'quest'])
    expect(withCard(['quest', 'creatine', 'rank'], 'magnesium')).toEqual(['quest', 'creatine', 'magnesium', 'rank'])
    expect(withCard(['rank', 'workout'], 'magnesium')).toEqual(['rank', 'workout', 'magnesium'])
    expect(withCard(['rank'], 'magnesium')).toEqual(['magnesium', 'rank'])
    expect(withCard(home, 'magnesium')).toBe(home)
  })
})
