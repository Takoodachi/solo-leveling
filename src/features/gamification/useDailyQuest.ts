import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { toast } from 'sonner'
import { useNow } from '@/hooks/useNow'
import { toDateStr } from '@/lib/date'
import { syncService } from '@/lib/sync'
import { XP } from '@/lib/xp'
import { changeSettings } from '@/features/settings/hooks/useSettings'
import { questBelowTiles } from '@/features/dashboard/homeWidgets'
import { claimQuest, loadQuest, type Quest } from './quest'

/** A day's quest, live: it moves as workouts, steps, food and check-ins are logged. */
export function useQuest(date: string): Quest | undefined {
  return useLiveQuery(() => loadQuest(date), [date])
}

const INTRODUCED_KEY = 'solo:questCard'

/**
 * A Home that was customized before the quest existed has a saved list of cards without it, so
 * the card would never show. Put it in (under the trackers) once per device; taking it off
 * again sticks.
 */
async function introduceQuestCard(): Promise<void> {
  if (localStorage.getItem(INTRODUCED_KEY)) return
  localStorage.setItem(INTRODUCED_KEY, '1')
  await changeSettings(s => (s?.homeWidgets && !s.homeWidgets.includes('quest') ? { homeWidgets: questBelowTiles(['quest', ...s.homeWidgets]) } : null))
}

const BELOW_TILES_KEY = 'solo:questBelowTiles'

/**
 * A saved Home with the quest above the trackers, where it used to be put, has it moved under
 * them: the trackers were below the first screen. Once per device; moving it back up sticks.
 */
async function moveQuestBelowTiles(): Promise<void> {
  if (localStorage.getItem(BELOW_TILES_KEY)) return
  localStorage.setItem(BELOW_TILES_KEY, '1')
  await changeSettings(s => {
    const moved = s?.homeWidgets && questBelowTiles(s.homeWidgets)
    return moved && moved !== s.homeWidgets ? { homeWidgets: moved } : null
  })
}

/**
 * Mount once (in App). Pays today's quest the moment its last objective is done, whatever
 * finished it: a set ticked, steps imported from the phone, a glass of water. `ready` waits
 * for the session check.
 */
export function useDailyQuestReward(ready: boolean): void {
  const today = toDateStr(useNow())
  const quest = useQuest(today)
  const due = ready && !!quest?.complete && !quest.claimed

  useEffect(() => {
    if (ready) void syncService.whenIdle().then(introduceQuestCard).then(moveQuestBelowTiles).catch(() => {})
  }, [ready])

  useEffect(() => {
    if (!due) return
    let cancelled = false
    // On a device that has just signed in, today's claim may still be on its way down
    void syncService.whenIdle().then(async () => {
      if (cancelled || !(await claimQuest(today))) return
      toast.success('Daily quest complete', { description: `+${XP.DAILY_QUEST} XP`, icon: '⚔️' })
    })
    return () => {
      cancelled = true
    }
  }, [due, today])
}
