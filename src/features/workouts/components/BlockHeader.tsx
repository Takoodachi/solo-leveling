import type { ReactNode } from 'react'
import { ArrowUp, ArrowDown, ChevronDown, X, Info } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useWorkoutStore } from '../store'
import type { HoldHandle } from '../hooks/useHoldToMove'

interface Props {
  name: string
  subtitle: ReactNode
  blockIdx: number
  isFirst: boolean
  isLast: boolean
  /** Folded away: the card shows this header only. */
  collapsed?: boolean
  onShowInfo: () => void
  /** Held on the name, the card can be carried to another place in the workout. */
  hold?: HoldHandle
}

const iconBtn = 'flex h-9 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent disabled:opacity-30'

/** Exercise name (tap for info, hold to move) + fold / reorder / remove controls, shared by set and cardio cards. */
export default function BlockHeader({ name, subtitle, blockIdx, isFirst, isLast, collapsed = false, onShowInfo, hold }: Props) {
  const { removeBlock, restoreBlock, moveBlock, toggleCollapsed } = useWorkoutStore()

  // Removing takes the logged sets with it and is one stray tap away, so it can be taken back
  function handleRemove() {
    const startedAt = useWorkoutStore.getState().draft?.startedAt
    const removed = removeBlock(blockIdx)
    if (!removed || startedAt == null) return
    toast(`Removed ${name}`, {
      duration: 7000,
      action: { label: 'Undo', onClick: () => restoreBlock(removed, blockIdx, startedAt) },
    })
  }

  return (
    <header className={cn('flex items-start gap-1', !collapsed && 'mb-3')}>
      <button
        type="button"
        className={cn(iconBtn, '-ml-1.5 w-7')}
        onClick={() => toggleCollapsed(blockIdx)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? `Show ${name}` : `Hide ${name}`}
      >
        <ChevronDown size={18} className={cn('transition-transform', collapsed && '-rotate-90')} />
      </button>
      <button type="button" {...hold} onClick={onShowInfo} className="min-w-0 flex-1 select-none text-left [-webkit-touch-callout:none]">
        <h3 className="flex items-center gap-1.5 text-base font-semibold leading-tight">
          <span className="line-clamp-2">{name}</span>
          <Info size={14} className="shrink-0 text-muted-foreground" />
        </h3>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground">{subtitle}</p>
      </button>
      <button type="button" className={iconBtn} disabled={isFirst} onClick={() => moveBlock(blockIdx, blockIdx - 1)} aria-label="Move up">
        <ArrowUp size={16} />
      </button>
      <button type="button" className={iconBtn} disabled={isLast} onClick={() => moveBlock(blockIdx, blockIdx + 1)} aria-label="Move down">
        <ArrowDown size={16} />
      </button>
      <button type="button" className={iconBtn} onClick={handleRemove} aria-label="Remove exercise">
        <X size={16} />
      </button>
    </header>
  )
}
