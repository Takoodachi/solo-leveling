import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db'
import { resetDb } from '@/test/db'
import { runQuickLog } from './quickLogTask'

/** One press of a reminder's log button, as the Android app's off-screen page runs it. */
async function press(kind: string, date = '2026-11-27') {
  let answer = ''
  await runQuickLog({ task: () => JSON.stringify({ kind, date }), done: result => { answer = result } })
  return JSON.parse(answer) as { ok: boolean; title: string }
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
})
