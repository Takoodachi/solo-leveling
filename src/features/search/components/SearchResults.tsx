import { ChevronRight } from 'lucide-react'
import type { ResultGroup } from '../useSearch'
import type { SearchItem } from '../searchIndex'

interface Props {
  query: string
  groups: ResultGroup[]
  onPick: (item: SearchItem) => void
}

export default function SearchResults({ query, groups, onPick }: Props) {
  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-3xl bg-card px-6 py-10 text-center">
        <p className="font-semibold">Nothing found for “{query.trim()}”</p>
        <p className="text-sm text-muted-foreground">Try a page, a setting, an exercise, a food or a routine.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5" role="region" aria-label="Search results">
      {groups.map(g => (
        <section key={g.key} className="flex flex-col gap-2">
          <h2 className="eyebrow px-1 text-muted-foreground">{g.label}</h2>
          <div className="flex flex-col overflow-hidden rounded-3xl bg-card">
            {g.items.map(item => (
              <button
                key={`${g.key}-${item.id}`}
                type="button"
                onClick={() => onPick(item)}
                className="flex items-center gap-3 border-b border-foreground/5 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-accent active:bg-accent"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <item.Icon size={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{item.title}</span>
                  {item.subtitle && <span className="block truncate text-xs text-muted-foreground">{item.subtitle}</span>}
                </span>
                <ChevronRight size={17} className="shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
