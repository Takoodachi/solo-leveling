import type { ReactNode } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import type { BlockDraft } from '../types'
import type { HoldHandle } from '../hooks/useHoldToMove'
import BlockHeader from './BlockHeader'
import ExerciseNote from './ExerciseNote'

/** What every logger card is given, whatever the exercise is logged with. */
export interface BlockCardProps {
  block: BlockDraft
  blockIdx: number
  isFirst: boolean
  isLast: boolean
  onShowInfo: () => void
  /** Swap this exercise for another, in the same place. Left off where that makes no sense (editing a past workout). */
  onReplace?: () => void
  /** Goes on the header: hold it to carry the card to another place. */
  hold?: HoldHandle
}

interface Props extends BlockCardProps {
  subtitle: ReactNode
  /** What the exercise is logged with (set rows, or the cardio entry); hidden while the card is folded away. */
  children: ReactNode
}

/** A logger card: the header (fold, move, remove), your note with the way to swap the exercise out, then its fields. */
export default function BlockCard({ block, blockIdx, isFirst, isLast, onShowInfo, onReplace, hold, subtitle, children }: Props) {
  return (
    <section className="rounded-3xl bg-card p-4">
      <BlockHeader
        name={block.exercise.name}
        subtitle={subtitle}
        blockIdx={blockIdx}
        isFirst={isFirst}
        isLast={isLast}
        collapsed={block.collapsed}
        onShowInfo={onShowInfo}
        hold={hold}
      />
      {!block.collapsed && (
        <>
          <div className="mb-3 flex items-start gap-2">
            <ExerciseNote exerciseId={block.exercise.uuid} cardio={block.exercise.type === 'cardio'} brief={!!onReplace} className="min-w-0 flex-1" />
            {onReplace && (
              <button
                type="button"
                onClick={onReplace}
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-secondary px-3 text-xs font-semibold text-foreground/80 hover:bg-accent"
              >
                <ArrowLeftRight size={14} /> Replace
              </button>
            )}
          </div>
          {children}
        </>
      )}
    </section>
  )
}
