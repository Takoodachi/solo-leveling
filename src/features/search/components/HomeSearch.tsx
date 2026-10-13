import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import type { Exercise } from '@/types'
import { useNow } from '@/hooks/useNow'
import { cn } from '@/lib/utils'
import { toDateStr } from '@/lib/date'
import { useAuthStore } from '@/features/auth/authStore'
import { useLeaderboardStore } from '@/features/leaderboard/store'
import LogStepsSheet from '@/features/dashboard/components/LogStepsSheet'
import WaterSheet from '@/features/checkins/components/WaterSheet'
import ExerciseInfoSheet from '@/features/workouts/components/ExerciseInfoSheet'
import { useSearch } from '../useSearch'
import type { SearchItem } from '../searchIndex'
import SearchResults from './SearchResults'
import { useStuck } from '../useStuck'
import { useCloseOnBack } from '@/hooks/useAndroidBack'

interface Props {
  /** While open, Home shows results in place of its cards. */
  open: boolean
  onOpenChange: (open: boolean) => void
  onCustomize: () => void
}

/** Search for anything in the app, pinned under the greeting on Home. */
export default function HomeSearch({ open, onOpenChange, onCustomize }: Props) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  // Only a bar once the page is scrolling under it; before that it's a field on the page
  const stuck = useStuck(stripRef)
  const [query, setQuery] = useState('')
  const [sheet, setSheet] = useState<'steps' | 'water' | null>(null)
  const [info, setInfo] = useState<Exercise | null>(null)
  const today = toDateStr(useNow())
  const userId = useAuthStore(s => s.userId)
  const loadFriends = useLeaderboardStore(s => s.load)
  const groups = useSearch(query, open)

  function openSearch() {
    if (open) return
    onOpenChange(true)
    window.scrollTo(0, 0)
    if (userId) void loadFriends(userId)
  }

  function close() {
    setQuery('')
    inputRef.current?.blur()
    onOpenChange(false)
  }

  // Android's Back leaves the search before it leaves Home
  useCloseOnBack(open, close)

  function pick(item: SearchItem) {
    if (item.to) {
      navigate(item.to)
      return
    }
    close()
    if (item.exercise) setInfo(item.exercise)
    else if (item.action === 'log-steps') setSheet('steps')
    else if (item.action === 'log-water') setSheet('water')
    else if (item.action === 'customize-home') onCustomize()
  }

  return (
    <>
      <div ref={stripRef} className={cn('sticky top-[env(safe-area-inset-top)] z-30 -mx-4 -mt-2 bg-background/90 px-4 py-2 backdrop-blur-xl', !stuck && 'wallpaper-clear')}>
        <div className="flex items-center">
          {/* rounded-3xl on a field this tall is a pill, and it makes the field a card to the card styles (index.css) */}
          <label className="flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-3xl bg-card px-4 focus-within:ring-2 focus-within:ring-primary">
            <Search size={18} className="shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              value={query}
              onFocus={openSearch}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') close()
                if (e.key === 'Enter') {
                  const first = groups[0]?.items[0]
                  if (query.trim() && first) pick(first)
                }
              }}
              placeholder="Search workouts, foods, settings…"
              aria-label="Search the app"
              className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); inputRef.current?.focus() }}
                aria-label="Clear search"
                className="-mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
              >
                <X size={16} />
              </button>
            )}
          </label>
          {/* Always there, so the field gives way to it instead of jumping */}
          <button
            type="button"
            onClick={close}
            inert={!open}
            className={cn(
              'h-12 shrink-0 overflow-hidden whitespace-nowrap text-sm font-semibold text-primary transition-[max-width,opacity,padding] duration-200 ease-out',
              open ? 'max-w-24 pl-3 pr-1 opacity-100' : 'max-w-0 opacity-0',
            )}
          >
            Cancel
          </button>
        </div>
      </div>

      {open && <SearchResults query={query} groups={groups} onPick={pick} />}

      <LogStepsSheet open={sheet === 'steps'} onOpenChange={o => setSheet(o ? 'steps' : null)} />
      <WaterSheet open={sheet === 'water'} onOpenChange={o => setSheet(o ? 'water' : null)} date={today} today={today} />
      <ExerciseInfoSheet exercise={info} onClose={() => setInfo(null)} />
    </>
  )
}
