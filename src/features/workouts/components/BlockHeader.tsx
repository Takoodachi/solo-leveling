import type { ReactNode } from 'react'
import { ArrowUp, ArrowDown, X, Info } from 'lucide-react'
import { useWorkoutStore } from '../store'

interface Props {
  name: string
  subtitle: ReactNode
  blockIdx: number
  isFirst: boolean
  isLast: boolean
  onShowInfo: () => void
}

const iconBtn = 'flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent disabled:opacity-30'

/** Exercise name (tap for info) + reorder / remove controls, shared by set and cardio cards. */
export default function BlockHeader({ name, subtitle, blockIdx, isFirst, isLast, onShowInfo }: Props) {
  const { removeBlock, moveBlock } = useWorkoutStore()
  return (
    <header className="mb-3 flex items-start gap-2">
      <button type="button" onClick={onShowInfo} className="min-w-0 flex-1 text-left">
        <h3 className="flex items-center gap-1.5 text-base font-semibold leading-tight">
          <span className="truncate">{name}</span>
          <Info size={14} className="shrink-0 text-muted-foreground" />
        </h3>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">{subtitle}</p>
      </button>
      <button type="button" className={iconBtn} disabled={isFirst} onClick={() => moveBlock(blockIdx, -1)} aria-label="Move up">
        <ArrowUp size={16} />
      </button>
      <button type="button" className={iconBtn} disabled={isLast} onClick={() => moveBlock(blockIdx, 1)} aria-label="Move down">
        <ArrowDown size={16} />
      </button>
      <button type="button" className={iconBtn} onClick={() => removeBlock(blockIdx)} aria-label="Remove exercise">
        <X size={16} />
      </button>
    </header>
  )
}
