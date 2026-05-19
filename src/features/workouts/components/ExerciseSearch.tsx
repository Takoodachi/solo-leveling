import { useState } from 'react'
import { Search, Dumbbell, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useExercises } from '../hooks/useExercises'
import CreateExerciseForm from './CreateExerciseForm'
import type { Exercise } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (exercise: Exercise) => void
}

export default function ExerciseSearch({ open, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const { searchExercises, groupByCategory } = useExercises()

  const results = searchExercises(query)
  const grouped = groupByCategory(results)
  const categories = Object.keys(grouped).sort()

  function handleSelect(exercise: Exercise) {
    onSelect(exercise)
    setQuery('')
    onClose()
  }

  function handleCreated(exercise: Exercise) {
    setShowCreate(false)
    handleSelect(exercise)
  }

  if (showCreate) {
    return (
      <Dialog open={open} onOpenChange={open => !open && onClose()}>
        <DialogContent className="max-w-sm p-0 gap-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Create Exercise</DialogTitle>
          </DialogHeader>
          <CreateExerciseForm
            initialName={query}
            onCreated={handleCreated}
            onCancel={() => setShowCreate(false)}
          />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-sm p-0 gap-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>Add Exercise</DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-2 relative">
          <Search size={16} className="absolute left-7 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search exercises…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-8"
            autoFocus
          />
        </div>

        <ScrollArea className="h-[320px]">
          <div className="px-2 pb-2">
            {categories.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No exercises found</p>
            )}
            {categories.map(cat => (
              <div key={cat}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 py-2 mt-2">
                  {cat}
                </p>
                {grouped[cat].map(exercise => (
                  <button
                    key={exercise.uuid}
                    onClick={() => handleSelect(exercise)}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                      'hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      {exercise.imageUrl ? (
                        <img
                          src={exercise.imageUrl}
                          alt=""
                          className="w-10 h-10 rounded object-cover bg-muted flex-shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex-shrink-0 flex items-center justify-center">
                          <Dumbbell size={16} className="text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{exercise.name}</p>
                        {exercise.isCustom && (
                          <p className="text-[10px] text-primary">Custom</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="px-4 pb-4 pt-1 border-t border-border">
          <button
            onClick={() => setShowCreate(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <Plus size={14} />
            Create{query ? ` "${query}"` : ' custom exercise'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
