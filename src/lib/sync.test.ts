import { describe, expect, it, vi } from 'vitest'
import { sendEachOnRefusal } from './sync'

describe('sendEachOnRefusal', () => {
  it('sends once when the server takes the batch', async () => {
    const send = vi.fn(async () => null)
    expect(await sendEachOnRefusal([1, 2, 3], send)).toBeNull()
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('goes row by row after a refusal, so one bad row holds back only itself', async () => {
    const arrived: number[] = []
    const send = vi.fn(async (rows: number[]) => {
      if (rows.includes(2)) return new Error('invalid input syntax for type integer: "7.5"')
      arrived.push(...rows)
      return null
    })
    const error = await sendEachOnRefusal([1, 2, 3], send)
    expect(error?.message).toMatch(/integer/)
    expect(arrived).toEqual([1, 3])
  })

  it('stops at a network error instead of trying each row', async () => {
    const send = vi.fn(async () => new Error('Failed to fetch'))
    await sendEachOnRefusal([1, 2, 3], send)
    expect(send).toHaveBeenCalledTimes(1)
  })
})
