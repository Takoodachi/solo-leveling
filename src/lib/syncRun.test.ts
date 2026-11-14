import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/db'
import { resetDb } from '@/test/db'

// A server that takes everything and has nothing new, and notes what it was asked
const requests = vi.hoisted(() => [] as string[])
const server = vi.hoisted(() => ({ onPush: undefined as (() => Promise<void>) | undefined }))
vi.mock('./supabase', () => {
  const answer = (data: unknown) => Promise.resolve({ data, error: null })
  const from = (table: string) => {
    let single = false
    const query = {
      upsert: async (rows: unknown) => {
        requests.push(`push ${table} ${Array.isArray(rows) ? rows.length : 1}`)
        await server.onPush?.()
        return answer(null)
      },
      select: () => {
        requests.push(`pull ${table}`)
        return query
      },
      maybeSingle: () => {
        single = true
        return query
      },
      retry: () => answer(single ? null : []),
      eq: () => query, order: () => query, limit: () => query, gte: () => query, or: () => query,
    }
    return query
  }
  return { supabase: { from }, isSupabaseConfigured: true }
})
vi.stubGlobal('navigator', { onLine: true })
const stored = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => stored.get(key) ?? null,
  setItem: (key: string, value: string) => void stored.set(key, value),
  removeItem: (key: string) => void stored.delete(key),
})

const { syncService } = await import('./sync')

const log = (uuid: string) => ({ uuid, date: '2026-11-01', foodId: 'food-apple', servings: 1, mealType: 'snack' as const, updatedAt: 1, syncPending: true })
const pushes = () => requests.filter(r => r.startsWith('push'))
const pulls = () => requests.filter(r => r.startsWith('pull'))

describe('a sync run', () => {
  beforeEach(async () => {
    await resetDb()
    requests.length = 0
    syncService.setUser('user-1')
  })

  it('pushes what is pending, clears the flag and pulls every table once', async () => {
    await db.foodLog.bulkPut([log('a'), log('b')])
    await syncService.sync('user-1')
    expect(pushes()).toEqual(['push food_log 2'])
    expect(pulls()).toHaveLength(17)
    expect((await db.foodLog.toArray()).every(row => row.syncPending === false)).toBe(true)
  })

  it('does not read a table again while nothing has written to it', async () => {
    await db.foodLog.put(log('a'))
    await syncService.sync('user-1')
    const read = vi.spyOn(db.foodLog, 'toArray')
    await syncService.sync('user-1')
    expect(read).not.toHaveBeenCalled()

    await db.foodLog.put(log('b')) // a write: looked through again, and pushed
    requests.length = 0
    await syncService.sync('user-1')
    expect(read).toHaveBeenCalledTimes(1)
    expect(pushes()).toEqual(['push food_log 1'])
    read.mockRestore()
  })

  it('pushes a write that lands mid-run without pulling a second time', async () => {
    await db.foodLog.put(log('a'))
    // While the first row is on its way up, another is logged
    server.onPush = async () => {
      server.onPush = undefined
      await db.foodLog.put(log('b'))
      syncService.request()
    }
    await syncService.sync('user-1')
    expect(pushes()).toEqual(['push food_log 1', 'push food_log 1'])
    expect(pulls()).toHaveLength(17)
    expect((await db.foodLog.toArray()).every(row => row.syncPending === false)).toBe(true)
  })
})
