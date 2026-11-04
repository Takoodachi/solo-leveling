import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/db'
import { resetDb } from '@/test/db'
import type { HeartRateReading } from '@/lib/native'
import { awaitHeartRate, fillHeartRates } from './workoutHeartRate'

const heartRate = vi.fn<(range: { start: number; end: number }) => Promise<HeartRateReading>>()
vi.mock('@/lib/native', () => ({ soloHas: () => true, soloPlugin: async () => ({ heartRate }) }))
vi.mock('@/lib/sync', async importOriginal => ({ ...(await importOriginal<typeof import('@/lib/sync')>()), requestSync: vi.fn() }))

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
})

const start = Date.now() - 2 * 3_600_000
const end = start + 3_600_000
const waiting = () => JSON.parse(store.get('solo:heartRatePending') ?? '[]') as { id: string }[]

async function seed(avgHeartRate?: number) {
  const now = Date.now()
  await db.workouts.put({ uuid: 'w1', date: '2026-11-03', name: 'Push Day', notes: '', durationMin: 60, startedAt: start, createdAt: start, kcalEst: 280, avgHeartRate, updatedAt: now })
  await db.bodyMetrics.put({ uuid: 'weight-2026-11-03', date: '2026-11-03', weightKg: 80, updatedAt: now })
}

describe('workout heart rate from the watch', () => {
  beforeEach(async () => {
    await resetDb()
    store.clear()
    heartRate.mockReset()
  })

  it('fills in the average and works the calories out again from it', async () => {
    await seed()
    heartRate.mockResolvedValue({ granted: true, count: 40, avg: 131.6, max: 162 })
    await awaitHeartRate('w1', start, end)
    expect(heartRate).toHaveBeenCalledWith({ start, end })
    expect(await db.workouts.get('w1')).toMatchObject({ avgHeartRate: 132, kcalEst: 400, syncPending: true }) // 69% of max: 5 MET × 80 kg × 1 h
    expect(waiting()).toEqual([])
  })

  it('keeps waiting while the readings haven’t arrived or access isn’t given', async () => {
    await seed()
    heartRate.mockResolvedValue({ granted: true, count: 2, avg: 120, max: 125 })
    await awaitHeartRate('w1', start, end)
    heartRate.mockResolvedValue({ granted: false })
    await fillHeartRates()
    expect((await db.workouts.get('w1'))?.avgHeartRate).toBeUndefined()
    expect(waiting().map(p => p.id)).toEqual(['w1'])
  })

  it('never replaces a heart rate typed in', async () => {
    await seed(110)
    await awaitHeartRate('w1', start, end)
    expect(heartRate).not.toHaveBeenCalled()
    expect((await db.workouts.get('w1'))?.avgHeartRate).toBe(110)
    expect(waiting()).toEqual([])
  })
})
