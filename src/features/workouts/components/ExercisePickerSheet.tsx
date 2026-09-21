import { useMemo, useState } from 'react'
import { Search, Plus, ChevronRight } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { EXERCISE_CATEGORIES } from '@/data/exercises'
import type { Exercise } from '@/types'
import { cn } from '@/lib/utils'
import { useExercises } from '../hooks/useExercises'
import CreateExerciseForm from './CreateExerciseForm'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (exercise: Exercise) => void
  title?: string
}

export default function ExercisePickerSheet({ open, onOpenChange, onSelect, title = 'Add exercise' }: Props) {
  const { searchExercises } = useExercises()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const results = searchExercises(query)
  const filtered = useMemo(
    () => (category ? results.filter(e => e.category === category) : results),
    [results, category],
  )

  function close() {
    setQuery('')
    setCategory(null)
    setCreating(false)
    onOpenChange(false)
  }

  function pick(exercise: Exercise) {
    onSelect(exercise)
    close()
  }

  return (
    <Sheet open={open} onOpenChange={o => (o ? onOpenChange(true) : close())}>
      <SheetContent side="bottom" className="flex h-[90dvh] flex-col gap-3 px-4">
        <SheetHeader className="text-left">
          <SheetTitle className="text-xl">{creating ? 'New exercise' : title}</SheetTitle>
        </SheetHeader>

        {creating ? (
          <CreateExerciseForm initialName={query} onCreated={pick} onCancel={() => setCreating(false)} />
        ) : (
          <>
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search exercises or muscles"
                className="pl-11"
                enterKeyHint="search"
              />
            </div>
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
              {[null, ...EXERCISE_CATEGORIES].map(c => (
                <button
                  key={c ?? 'all'}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    'h-9 shrink-0 rounded-full px-4 text-sm font-medium transition-colors',
                    category === c ? 'bg-foreground text-background' : 'bg-secondary text-foreground/80',
                  )}
                >
                  {c ?? 'All'}
                </button>
              ))}
            </div>
            <div className="-mx-2 min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {filtered.length === 0 && (
                <p className="py-10 text-center text-sm text-muted-foreground">No matches.</p>
              )}
              {filtered.map(e => (
                <button
                  key={e.uuid}
                  type="button"
                  onClick={() => pick(e)}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-secondary active:bg-secondary"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{e.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {e.category}{e.muscles?.[0] ? ` · ${e.muscles[0]}` : ''}{e.isCustom ? ' · Custom' : ''}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </button>
              ))}
            </div>
            <Button variant="secondary" className="gap-2" onClick={() => setCreating(true)}>
              <Plus size={16} />
              Create custom exercise
            </Button>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
