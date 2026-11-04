import { toast } from 'sonner'
import { toDateStr } from '@/lib/date'
import { afterStage } from '@/features/gamification/celebration'
import { buildMySnapshot } from './snapshot'
import { useLeaderboardStore } from './store'
import { highlightKey, joinNames, markHighFivesSeen, seenUntil, useHighFiveStore, type HighFive } from './highFives'
import type { Highlight } from './types'

const toastDayKey = (userId: string) => `solo:highFiveToast:${userId}`

/**
 * The one line saying who high-fived what since `seen`, or null. Only high-fives on your
 * highlights as they are now, from friends on the leaderboard: the key is the giver's text,
 * so one that matches nothing of yours is never shown.
 */
export function highFiveNews(rows: HighFive[], userId: string, seen: number, mine: Highlight[], names: Map<string, string>): string | null {
  const byKey = new Map(mine.map(h => [highlightKey(h), h]))
  const fresh = rows.filter(r => r.to === userId && Date.parse(r.at) > seen && byKey.has(r.key) && names.has(r.from))
  if (!fresh.length) return null
  const senders = [...new Set(fresh.map(r => names.get(r.from) ?? ''))]
  const keys = [...new Set(fresh.map(r => r.key))]
  const one = byKey.get(keys[0])
  const what = keys.length > 1 ? `${keys.length} of your bests` : one?.kind === 'run' ? 'your run' : `your ${one?.name} best`
  return `${joinNames(senders)} high-fived ${what}`
}

/** At most one toast a day, for high-fives that came in since the leaderboard was last open. */
export async function announceHighFives(userId: string, open: () => void): Promise<void> {
  const today = toDateStr(new Date())
  try {
    if (localStorage.getItem(toastDayKey(userId)) === today) return
  } catch {
    return
  }
  const store = useHighFiveStore.getState()
  await store.load(userId)
  const rows = useHighFiveStore.getState().rows
  const seen = seenUntil(userId)
  if (!rows?.some(r => r.to === userId && Date.parse(r.at) > seen)) return

  await useLeaderboardStore.getState().load(userId)
  const names = new Map((useLeaderboardStore.getState().rows ?? []).filter(e => e.userId !== userId).map(e => [e.userId, e.name]))
  const text = highFiveNews(rows, userId, seen, (await buildMySnapshot()).highlights, names)
  if (!text) return
  markHighFivesSeen(userId, rows)
  localStorage.setItem(toastDayKey(userId), today)
  afterStage(() => toast(text, { action: { label: 'See', onClick: open } }))
}
