import { useNavigate } from 'react-router-dom'
import { ChevronRight, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/features/auth/authStore'
import { SETTING_ENTRIES } from '@/features/search/searchIndex'
import { searchSettings } from '@/features/search/settingsSearch'
import { isSupabaseConfigured } from '@/lib/supabase'

interface Props {
  query: string
  onQuery: (query: string) => void
}

/**
 * The search at the top of Settings (November 2026, at the owner's request): a setting's name, or
 * what you'd like to change in your own words ("make it darker", "stop the buzzing"). While there's
 * something in it, its results stand in for the sections; a tap clears it and opens the setting.
 */
export default function SettingsSearch({ query, onQuery }: Props) {
  const navigate = useNavigate()
  const signedIn = useAuthStore(s => !!s.userId)
  const searching = query.trim().length > 0
  const entries = SETTING_ENTRIES.filter(e => (e.only !== 'signedIn' || signedIn) && (e.only !== 'account' || isSupabaseConfigured))
  const results = searching ? searchSettings(query, entries) : []

  function open(to: string) {
    onQuery('')
    // A section on this page opens and the page lands on it (SettingsSection, useHashScroll)
    navigate(to, { replace: to.startsWith('/settings#') })
  }

  return (
    <>
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={e => onQuery(e.target.value)}
          placeholder="Search, or say what to change"
          aria-label="Search settings, or say what you'd like to change"
          enterKeyHint="search"
          className="bg-card px-11 [&::-webkit-search-cancel-button]:hidden"
          onKeyDown={e => {
            if (e.key === 'Enter' && results[0]?.to) open(results[0].to)
          }}
        />
        {query && (
          <button
            type="button"
            onClick={() => onQuery('')}
            className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground"
            aria-label="Clear search"
          >
            <X size={18} />
          </button>
        )}
      </div>
      {searching && (results.length > 0 ? (
        <ul className="overflow-hidden rounded-3xl bg-card" aria-label="Settings found">
          {results.map(r => (
            <li key={r.id} className="border-b border-foreground/5 last:border-0">
              <button type="button" onClick={() => r.to && open(r.to)} className="press-row flex w-full items-center gap-3 px-4 py-3 text-left">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary"><r.Icon size={18} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{r.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{r.subtitle}</span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-3xl bg-card p-5 text-sm text-muted-foreground">
          Nothing in Settings fits that. Try other words, like “colours”, “reminders” or “vibration”.
        </p>
      ))}
    </>
  )
}
