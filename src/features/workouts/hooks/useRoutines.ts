import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { Routine } from '@/types'
import { requestSync, deleteSynced } from '@/lib/sync'
import { getTemplate, type RoutineTemplate } from '@/data/routineTemplates'

export function useRoutines(): Routine[] {
  const routines = useLiveQuery(() => db.routines.orderBy('name').toArray(), [])
  return routines ?? []
}

export type RoutineOrTemplate =
  | { kind: 'routine'; routine: Routine }
  | { kind: 'template'; routine: RoutineTemplate & { scheduleDays: number[] } }

/** A saved routine, or a built-in template when the id starts with "tpl-". undefined while loading, null if missing. */
export function useRoutineOrTemplate(uuid: string | undefined): RoutineOrTemplate | null | undefined {
  return useLiveQuery(async () => {
    if (!uuid) return null
    const tpl = getTemplate(uuid)
    if (tpl) return { kind: 'template' as const, routine: { ...tpl, scheduleDays: [] } }
    const routine = await db.routines.get(uuid)
    return routine ? { kind: 'routine' as const, routine } : null
  }, [uuid])
}

export async function saveRoutine(routine: Omit<Routine, 'updatedAt' | 'syncPending'>): Promise<void> {
  await db.routines.put({ ...routine, updatedAt: Date.now(), syncPending: true })
  requestSync()
}

export async function deleteRoutine(uuid: string): Promise<void> {
  await deleteSynced(db.routines, 'routines', [uuid])
}

/** Copy a built-in template into the user's own routines. Returns the new id. */
export async function copyTemplate(tpl: RoutineTemplate, scheduleDays: number[] = []): Promise<string> {
  const uuid = crypto.randomUUID()
  await saveRoutine({ ...tpl, uuid, scheduleDays })
  return uuid
}

/** Assign a routine to a weekday (one routine per day), or clear the day with null. */
export async function setDayRoutine(day: number, routineUuid: string | null): Promise<void> {
  const now = Date.now()
  await db.transaction('rw', db.routines, async () => {
    const all = await db.routines.toArray()
    for (const r of all) {
      const has = r.scheduleDays.includes(day)
      const want = r.uuid === routineUuid
      if (has === want) continue
      const scheduleDays = want ? [...r.scheduleDays, day].sort((a, b) => a - b) : r.scheduleDays.filter(d => d !== day)
      await db.routines.put({ ...r, scheduleDays, updatedAt: now, syncPending: true })
    }
  })
  requestSync()
}
