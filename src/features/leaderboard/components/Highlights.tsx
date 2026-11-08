import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Hand } from 'lucide-react'
import { useNow } from '@/hooks/useNow'
import RankBadge from '@/features/ranks/components/RankBadge'
import { rankFor } from '@/features/ranks/tiers'
import { useAuthStore } from '@/features/auth/authStore'
import { ago, profileLink } from '../boards'
import { highlightKey, joinNames, markHighFivesSeen, useHighFiveStore } from '../highFives'
import type { LeaderboardEntry } from '../types'
import { ink } from '@/lib/colors'
import { tap } from '@/lib/haptics'
import { cn } from '@/lib/utils'

const MAX = 8

/**
 * Everyone's new bests from the last two weeks, newest first. A friend's can be high-fived
 * (when you're on the leaderboard yourself); yours say who high-fived them.
 */
export default function Highlights({ entries, canHighFive }: { entries: LeaderboardEntry[]; canHighFive: boolean }) {
  const now = useNow()
  const userId = useAuthStore(s => s.userId)
  const online = useAuthStore(s => !!s.session)
  const { rows: fives, load, toggle } = useHighFiveStore()
  useEffect(() => {
    if (userId && online) void load(userId)
  }, [userId, online, load])
  useEffect(() => {
    if (userId && fives) markHighFivesSeen(userId, fives)
  }, [userId, fives])

  const names = new Map(entries.filter(e => !e.me).map(e => [e.userId, e.name]))
  const fromFriends = (key: string) => (fives ?? []).filter(f => f.to === userId && f.key === key && names.has(f.from)).map(f => names.get(f.from) ?? '')
  const items = entries
    .flatMap(e => (e.snapshot.highlights ?? []).map(h => ({ ...h, who: e, key: highlightKey(h) })))
    .sort((a, b) => b.date.localeCompare(a.date))
    // Yours that were high-fived stay in the list, so the digest's "See" finds them.
    .filter((h, i) => i < MAX || (h.who.me && fromFriends(h.key).length > 0))

  if (items.length === 0) {
    return <p className="rounded-3xl bg-card p-5 text-sm text-muted-foreground">New bests from the last two weeks show up here.</p>
  }

  return (
    <ul className="flex flex-col divide-y divide-foreground/5 rounded-3xl bg-card px-4">
      {items.map((h, i) => {
        const rank = rankFor(h.rating)
        const senders = h.who.me ? fromFriends(h.key) : []
        const given = !!fives?.some(f => f.from === userId && f.to === h.who.userId && f.key === h.key)
        return (
          <li key={`${h.who.userId}-${h.name}-${i}`} className="flex items-center gap-1">
            <Link to={profileLink(h.who)} className="press-row -ml-2 flex min-w-0 flex-1 items-center gap-3 rounded-2xl py-3 pl-2">
              <RankBadge tier={rank.tier.key} division={rank.division} size={34} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">
                  <b>{h.who.me ? 'You' : h.who.name}</b> · {h.name}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {h.detail} · <span style={{ color: ink(rank.tier.color) }}>{rank.label}</span>
                </span>
                {senders.length > 0 && (
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-primary">
                    <Hand size={12} strokeWidth={2.5} className="shrink-0" aria-hidden="true" />
                    <span className="truncate">High-fived by {joinNames(senders)}</span>
                  </span>
                )}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{ago(h.date, now)}</span>
            </Link>
            {!h.who.me && canHighFive && fives && (
              <button
                type="button"
                aria-pressed={given}
                aria-label={given ? `Take back your high-five on ${h.who.name}’s ${h.name}` : `High-five ${h.who.name}’s ${h.name}`}
                onClick={() => {
                  if (!given) tap()
                  void toggle(h.who.userId, h.key)
                }}
                className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
              >
                <span className={cn('flex h-9 w-9 items-center justify-center rounded-full transition-colors', given ? 'animate-pop bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-accent')}>
                  <Hand size={20} strokeWidth={given ? 2.25 : 2} />
                </span>
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
