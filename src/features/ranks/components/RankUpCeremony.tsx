import { useEffect, useEffectEvent, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { RankUp } from '../computeRanks'
import { KIND_LABEL, ceremonyKind, sceneSubject, sceneTiming } from '../rankUpCeremony'
import { useTriplePress } from '../useTriplePress'
import RankUpScene from './RankUpScene'
import { RisingChevrons } from './RankUpEffects'

interface Props {
  /** The rank-ups to play, one scene each; null while there's nothing to show. */
  ups: RankUp[] | null
  /** The last scene ended, or the user skipped. */
  onDone: () => void
}

/**
 * The rank-up sequence: a full-screen stage that plays a scene per rank-up and closes itself.
 * Always dark, like the share card: the glow and the rays need a dark stage, whatever the theme.
 * Three presses anywhere skip the rest (useTriplePress).
 */
export default function RankUpCeremony({ ups, onDone }: Props) {
  return createPortal(
    <AnimatePresence>{ups && ups.length > 0 && <Stage key="stage" ups={ups} onDone={onDone} />}</AnimatePresence>,
    document.body,
  )
}

function Stage({ ups, onDone }: { ups: RankUp[]; onDone: () => void }) {
  const [index, setIndex] = useState(0)
  const { count, press } = useTriplePress(onDone)
  const finish = useEffectEvent(onDone)
  const up = ups[Math.min(index, ups.length - 1)]
  const seconds = sceneTiming(up).end

  useEffect(() => {
    const timer = setTimeout(() => (index + 1 < ups.length ? setIndex(index + 1) : finish()), seconds * 1000)
    return () => clearTimeout(timer)
  }, [index, ups.length, seconds])

  // Nothing behind the stage should scroll while it's up
  useEffect(() => {
    const before = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = before }
  }, [])

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Rank up"
      onClick={press}
      className="fixed inset-0 z-[60] flex touch-none select-none flex-col items-center justify-center overflow-hidden bg-[#070709] text-zinc-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <RisingChevrons color={up.to.tier.color} />
      <AnimatePresence mode="wait">
        <RankUpScene key={`${index}-${up.id}`} up={up} />
      </AnimatePresence>
      <p className="sr-only" aria-live="polite">{KIND_LABEL[ceremonyKind(up)]}: {sceneSubject(up)}, {up.to.label}</p>

      <motion.div
        className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        {ups.length > 1 && (
          <div className="flex gap-1.5" aria-hidden="true">
            {ups.map((u, i) => (
              <span key={u.id} className={cn('h-1 w-6 rounded-full', i <= index ? 'bg-zinc-200' : 'bg-zinc-700')} />
            ))}
          </div>
        )}
        <p className="flex items-center gap-2 text-xs text-zinc-500">
          Tap 3 times to skip
          <span className="flex gap-1" aria-hidden="true">
            {[1, 2, 3].map(n => (
              <span key={n} className={cn('h-1.5 w-1.5 rounded-full transition-colors', n <= count ? 'bg-zinc-100' : 'bg-zinc-700')} />
            ))}
          </span>
        </p>
      </motion.div>
    </motion.div>
  )
}
