import { useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useCloseOnBack } from '@/hooks/useAndroidBack'
import { buzz } from '@/lib/haptics'
import { Burst, Glow, Rays, RisingChevrons } from '@/features/ranks/components/RankUpEffects'
import { centered, type SceneTiming } from '@/features/ranks/rankUpCeremony'
import { ACHIEVEMENT_CATEGORIES, achievementDef, achievementXp } from '../achievements'
import { endCelebration, useCelebration } from '../celebration'

// The theme's accent carries the light show; the stage is always dark, like the rank-up sequence's
const COLOR = 'hsl(var(--primary))'
// The rank-up's effects on a shorter clock: no charge-up, the burst lands as the medal does
const TIMING: SceneTiming = { charge: 0, burst: 0.45, end: 3 }

/**
 * An achievement full screen, opened by tapping its toast: the medal lands in a burst of light
 * with what it's called and what it's for. A tap anywhere, Escape or Back closes it.
 */
export default function AchievementCelebration() {
  const { key, goal } = useCelebration()
  const def = key ? achievementDef(key) : undefined
  const still = useReducedMotion()
  useCloseOnBack(!!def, endCelebration)

  useEffect(() => {
    const timer = setTimeout(() => buzz([25, 60, 45]), TIMING.burst * 1000)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && endCelebration()
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', onKey)
    }
  }, [key])

  if (!def) return null
  const category = ACHIEVEMENT_CATEGORIES.find(c => c.key === def.category)?.label
  const rise = (delay: number) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.4 } })

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="achievement-title"
      aria-describedby="achievement-about"
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center overflow-hidden bg-zinc-950 px-6 pb-safe pt-safe text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      onClick={endCelebration}
    >
      {!still && <RisingChevrons color={COLOR} />}
      <motion.p className="relative text-[13px] font-semibold uppercase tracking-[0.32em]" style={{ color: COLOR }} {...rise(0.05)}>
        {goal ? 'Goal reached' : 'Achievement unlocked'}
      </motion.p>

      <div className="relative my-2 h-[264px] w-[264px]">
        {!still && (
          <>
            <Rays color={COLOR} t={TIMING} />
            <Glow color={COLOR} t={TIMING} />
            <Burst color={COLOR} t={TIMING} />
          </>
        )}
        <motion.div
          className="flex items-center justify-center rounded-full border-2 bg-zinc-900"
          style={{ ...centered(148), borderColor: COLOR, boxShadow: `0 0 48px color-mix(in srgb, ${COLOR} 45%, transparent)` }}
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: 1, scale: [0.3, 1.18, 1] }}
          transition={{ duration: 0.6, times: [0, 0.65, 1], ease: 'easeOut' }}
        >
          <span className="text-[84px] leading-none" aria-hidden="true">{def.icon}</span>
        </motion.div>
      </div>

      <motion.h2 id="achievement-title" className="relative font-heading text-3xl font-bold text-zinc-50" {...rise(0.45)}>
        {def.title}
      </motion.h2>
      <motion.p id="achievement-about" className="relative mt-2 max-w-xs text-balance text-base text-zinc-300" {...rise(0.6)}>
        {def.description}
      </motion.p>
      {category && (
        <motion.p className="relative mt-3 text-xs font-semibold uppercase tracking-widest text-zinc-500" {...rise(0.7)}>
          {category} · +{achievementXp(def)} XP
        </motion.p>
      )}
      <motion.button
        type="button"
        autoFocus
        onClick={endCelebration}
        className="relative mt-9 h-12 rounded-full bg-zinc-50 px-10 font-semibold text-zinc-950"
        {...rise(0.85)}
      >
        Nice!
      </motion.button>
    </motion.div>
  )
}
