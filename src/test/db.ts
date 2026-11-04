import { parseISO, subDays } from 'date-fns'
import { db } from '@/db'
import { toDateStr } from '@/lib/date'

/** Empty every table, so each test starts from nothing. */
export async function resetDb(): Promise<void> {
  await Promise.all(db.tables.map(table => table.clear()))
}

/** The day `n` days before `day` (YYYY-MM-DD). */
export const daysBefore = (day: string, n: number) => toDateStr(subDays(parseISO(day), n))
