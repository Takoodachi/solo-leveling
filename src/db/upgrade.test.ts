import Dexie from 'dexie'
import { expect, it } from 'vitest'
import { db } from '@/db'

// Its own file: the database must be the last release's before the app's opens it
it('drops the kg a lift was switched back to, so it follows the account, and keeps lb', async () => {
  const stores = Object.fromEntries(db.tables.map(t => [t.name, [t.schema.primKey.src, ...t.schema.indexes.map(i => i.src)].join(',')]))
  const old = new Dexie('SoloLevelingDB')
  old.version(20).stores(stores)
  await old.table('exerciseNotes').bulkPut([
    { uuid: 'note-a', exerciseId: 'a', text: '', unit: 'kg', updatedAt: 1 },
    { uuid: 'note-b', exerciseId: 'b', text: 'pin 7', unit: 'lb', updatedAt: 1 },
  ])
  old.close()

  const [a, b] = await db.exerciseNotes.bulkGet(['note-a', 'note-b'])
  expect(a?.unit).toBeUndefined()
  expect(a?.syncPending).toBe(true)
  expect(b).toEqual({ uuid: 'note-b', exerciseId: 'b', text: 'pin 7', unit: 'lb', updatedAt: 1 })
})
