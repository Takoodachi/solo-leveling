import { useState } from 'react'
import { Search, X } from 'lucide-react'
import type { Exercise } from '@/types'
import { matchScore } from '@/lib/search'
import { cn } from '@/lib/utils'

interface Lift {
  exercise: Exercise
  sessions: number
}

interface Props {
  lifts: Lift[]
  selectedId: string
  onSelect: (exerciseId: string) => void
}

/** Most trained shown without searching; the one on screen always has a chip. */
const TOP = 12

/** Search box + chips for picking which lift the strength chart shows. */
export default function LiftPicker({ lifts, selectedId, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const matchesFor = (q: string) =>
    lifts
      .map(l => ({ l, score: matchScore(q, l.exercise.name, `${l.exercise.category} ${l.exercise.muscles?.join(' ') ?? ''}`) }))
      .filter(m => m.score > 0)
      .sort((a, b) => b.score - a.score || b.l.sessions - a.l.sessions)
      .map(m => m.l)

  const searching = query.trim() !== ''
  const matches = searching ? matchesFor(query) : []
  const top = lifts.slice(0, TOP)
  const selected = lifts.find(l => l.exercise.uuid === selectedId)
  const chips = searching ? matches : selected && !top.includes(selected) ? [selected, ...top] : top

  // Follow the search: when the lift on screen stops matching, show the best match.
  function handleChange(value: string) {
    setQuery(value)
    const next = value.trim() ? matchesFor(value) : []
    if (next.length > 0 && !next.some(l => l.exercise.uuid === selectedId)) onSelect(next[0].exercise.uuid)
  }

  return (
    <div className="mb-4 flex flex-col gap-3">
      <label className="flex h-11 items-center gap-2 rounded-full bg-secondary px-4 focus-within:ring-2 focus-within:ring-primary">
        <Search size={17} className="shrink-0 text-muted-foreground" />
        <input
          type="search"
          enterKeyHint="search"
          value={query}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') handleChange('')
          }}
          placeholder={`Search ${lifts.length} lift${lifts.length === 1 ? '' : 's'}`}
          aria-label="Search lifts"
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
        />
        {searching && (
          <button type="button" onClick={() => handleChange('')} aria-label="Clear search" className="-mr-2 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent">
            <X size={16} />
          </button>
        )}
      </label>

      {searching && matches.length === 0 ? (
        <p className="px-1 text-sm text-muted-foreground">No logged lift matches “{query.trim()}”.</p>
      ) : (
        <div className={cn(searching ? 'flex flex-wrap gap-2' : 'no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5')}>
          {chips.map(({ exercise }) => (
            <button
              key={exercise.uuid}
              type="button"
              onClick={() => onSelect(exercise.uuid)}
              className={cn(
                'h-9 shrink-0 rounded-full px-3.5 text-sm font-medium',
                exercise.uuid === selectedId ? 'bg-foreground text-background' : 'bg-secondary text-foreground/80',
              )}
            >
              {exercise.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
