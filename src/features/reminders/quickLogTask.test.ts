import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/db'
import { syncInBackground } from '@/features/health/backgroundSteps'
import { DEFAULT_WATER_GLASS_ML } from '@/features/settings/hooks/useSettings'
import { resetDb } from '@/test/db'
import { runQuickLog } from './quickLogTask'

// The sync after a log isn't what's tested here; left real, it runs whenever .env.local is present
vi.mock('@/features/health/backgroundSteps', () => ({ syncInBackground: vi.fn(async () => '') }))

/** One press of a reminder's log button, as the Android app's off-screen page runs it. */
async function press(kind: string, date = '2026-11-27') {
  let answer = ''
  await runQuickLog({ task: () => JSON.stringify({ kind, date }), done: result => { answer = result } })
  return JSON.parse(answer) as { ok: boolean; title: string; detail: string }
}

describe('a reminder’s log button, with the app closed', () => {
  beforeEach(resetDb)

  it('ticks magnesium off for the reminder’s day, once, as it does creatine', async () => {
    expect(await press('magnesium')).toMatchObject({ ok: true, title: 'Magnesium ticked off' })
    expect(await db.checkins.get('magnesium-2026-11-27')).toMatchObject({ key: 'magnesium', done: true, syncPending: true })
    expect(await press('magnesium')).toMatchObject({ ok: true, title: 'Magnesium was already ticked off' })
    expect(await press('creatine')).toMatchObject({ ok: true, title: 'Creatine ticked off' })
    expect(await press('protein')).toMatchObject({ ok: false })
  })

  it('says a log is saved when the sync after it throws, so the glass isn’t added again', async () => {
    vi.mocked(syncInBackground).mockRejectedValueOnce(new Error('lock timed out'))
    expect(await press('water')).toMatchObject({ ok: true, detail: 'Saved on this phone (sync failed: lock timed out)' })
    expect(await db.checkins.get('water-2026-11-27')).toMatchObject({ amount: DEFAULT_WATER_GLASS_ML })
  })
})
