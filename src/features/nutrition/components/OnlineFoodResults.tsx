import { ChevronRight, Globe, Loader2, WifiOff } from 'lucide-react'
import type { ScannedFood } from '../openFoodFacts'
import type { OnlineSearch } from '../hooks/useOnlineFoodSearch'

interface Props {
  /** What's in the search field, trimmed. */
  query: string
  /** The online search for that text, if one was asked for. */
  search: OnlineSearch | null
  online: boolean
  /** Barcodes of products already saved on this device. */
  saved: Set<string>
  onSearch: () => void
  onPick: (found: ScannedFood) => void
}

function describe(f: ScannedFood): string {
  const per = `${f.amount} ${f.unit}`
  if (f.values.kcal == null) return `Calories missing · per ${per}`
  const macro = (label: string, v: number | null) => (v == null ? null : `${label} ${v}`)
  return [`${f.values.kcal} cal / ${per}`, macro('P', f.values.protein), macro('C', f.values.carbs), macro('F', f.values.fat)].filter(Boolean).join(' · ')
}

/**
 * Under the foods on this device: look the same words up in Open Food Facts (packaged products,
 * crowd-sourced). It only goes online on a tap, and a product picked there is checked before
 * it's saved, like a scanned barcode.
 */
export default function OnlineFoodResults({ query, search, online, saved, onSearch, onPick }: Props) {
  if (!search) {
    return (
      <button
        type="button"
        onClick={onSearch}
        disabled={!online}
        className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent disabled:opacity-60"
      >
        {online ? <Globe size={18} className="shrink-0 text-primary" /> : <WifiOff size={18} className="shrink-0 text-muted-foreground" />}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">Search online for “{query}”</span>
          <span className="block text-xs text-muted-foreground">
            {online ? 'Packaged foods from Open Food Facts' : 'You’re offline: only the foods on this device'}
          </span>
        </span>
      </button>
    )
  }

  if (search.status === 'loading') {
    return (
      <p className="flex items-center justify-center gap-2 px-3 py-5 text-sm text-muted-foreground" role="status">
        <Loader2 size={16} className="shrink-0 animate-spin text-primary" />
        {search.waiting ? 'Open Food Facts is busy. Trying again in a few seconds…' : 'Searching Open Food Facts…'}
      </p>
    )
  }

  if (search.status === 'error') {
    return (
      <div className="px-3 py-4 text-center text-sm text-muted-foreground">
        <p>{online ? 'Open Food Facts didn’t answer. It’s often busy: give it a few seconds.' : 'You’re offline.'}</p>
        <button type="button" onClick={onSearch} disabled={!online} className="mt-1 h-10 px-3 font-semibold text-primary disabled:opacity-50">
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="mt-1">
      <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Online · Open Food Facts</p>
      {search.results.length === 0 && (
        <p className="px-3 py-3 text-sm text-muted-foreground">Nothing there for “{query}”. You can create it as a custom food.</p>
      )}
      {search.results.map(f => (
        <button
          key={f.barcode}
          type="button"
          onClick={() => onPick(f)}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent"
        >
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-sm">{f.name}</span>
              {saved.has(f.barcode) && (
                <span className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">Saved</span>
              )}
            </span>
            <span className="block truncate text-xs text-muted-foreground">{describe(f)}</span>
          </span>
          <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
        </button>
      ))}
    </div>
  )
}
