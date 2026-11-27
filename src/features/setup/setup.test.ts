import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db'
import { resetDb } from '@/test/db'
import type { Settings } from '@/types'
import { EMPTY_SETUP, finishSetup, type TrackChoice } from './setup'

async function homeAfter(track: TrackChoice[], redo = false) {
  await finishSetup({ ...EMPTY_SETUP, track }, redo)
  return (await db.settings.get(1))?.homeWidgets
}

describe('what the setup tracks', () => {
  beforeEach(resetDb)

  it('puts magnesium on Home only when it’s picked, beside creatine', async () => {
    expect(await homeAfter(['food', 'steps', 'water'])).not.toContain('magnesium')
    await resetDb()
    expect(await homeAfter(['water', 'creatine', 'magnesium'])).toEqual(['workout', 'water', 'creatine', 'magnesium', 'quest', 'rank', 'leaderboard', 'streak'])
  })

  it('a redo adds it to a Home of the user’s own and takes it off again, leaving the rest', async () => {
    await db.settings.put({ id: 1, homeWidgets: ['quest', 'creatine', 'rank'], updatedAt: 1 } as Settings)
    expect(await homeAfter(['creatine', 'magnesium'], true)).toEqual(['quest', 'creatine', 'magnesium', 'rank'])
    expect(await homeAfter(['creatine'], true)).toEqual(['quest', 'creatine', 'rank'])
  })
})
