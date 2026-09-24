import { db } from '@/db'
import { supabase } from '@/lib/supabase'
import type { Settings } from '@/types'
import { buildMySnapshot } from './snapshot'
import type { LeaderboardEntry, LeaderboardSnapshot } from './types'

interface Row {
  user_id: string
  displayName: string
  visible: boolean
  snapshot: LeaderboardSnapshot | Record<string, never>
  updatedAt: string
}
type Result<T> = PromiseLike<{ data: T; error: { message: string } | null }>
interface Table {
  upsert: (row: Row, options: { onConflict: string }) => Result<unknown>
  select: (columns: string) => { eq: (column: string, value: unknown) => Result<Row[] | null> }
}
// The typed client doesn't describe this table.
const table = () => (supabase as unknown as { from: (name: 'leaderboard') => Table }).from('leaderboard')

/** Name on the leaderboard: the profile name, else the email's first part (as on Profile). */
export function leaderboardName(settings: Settings | undefined, email: string | undefined): string {
  return settings?.displayName?.trim() || email?.split('@')[0] || 'Friend'
}

export function isSharing(settings: Settings | undefined): boolean {
  return settings?.shareOnLeaderboard !== false
}

const publishedKey = (userId: string) => `solo:leaderboard:${userId}`

/**
 * Publish this account's row. Skipped when nothing changed since the last publish.
 * With sharing off, the row becomes invisible and its snapshot is emptied.
 */
export async function publishLeaderboard(userId: string, email: string | undefined): Promise<void> {
  const settings = await db.settings.get(1)
  const visible = isSharing(settings)
  const snapshot = visible ? await buildMySnapshot() : {}
  const row: Row = { user_id: userId, displayName: leaderboardName(settings, email), visible, snapshot, updatedAt: new Date().toISOString() }
  const signature = JSON.stringify([row.displayName, visible, snapshot])
  try {
    if (localStorage.getItem(publishedKey(userId)) === signature) return
  } catch {
    // storage unavailable: publish anyway
  }
  const { error } = await table().upsert(row, { onConflict: 'user_id' })
  if (error) throw new Error(error.message)
  try {
    localStorage.setItem(publishedKey(userId), signature)
  } catch {
    // next publish just repeats it
  }
}

/** Everyone who shares, including this account's last published row. */
export async function fetchLeaderboard(userId: string): Promise<LeaderboardEntry[]> {
  const { data, error } = await table().select('user_id, displayName, snapshot, updatedAt').eq('visible', true)
  if (error) throw new Error(error.message)
  return (data ?? []).flatMap(r => {
    const s = r.snapshot as Partial<LeaderboardSnapshot>
    if (s.v !== 1) return []
    return [{ userId: r.user_id, name: r.displayName || 'Friend', snapshot: s as LeaderboardSnapshot, updatedAt: r.updatedAt, me: r.user_id === userId }]
  })
}
