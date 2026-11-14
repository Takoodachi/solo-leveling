import { describe, expect, it } from 'vitest'
import { mixHex } from './sendWidgets'

describe('a tier colour as the widget writes it', () => {
  it('keeps the colour on a dark theme and mixes it toward the text on a light one', () => {
    expect(mixHex('#f5c84c', '#ffffff', 1)).toBe('#f5c84c')
    expect(mixHex('#ff0000', '#000000', 0.5)).toBe('#800000')
    expect(mixHex('#f5c84c', '#1a1a1a', 0)).toBe('#1a1a1a')
  })
})
