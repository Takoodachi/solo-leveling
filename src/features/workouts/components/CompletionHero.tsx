import { useEffect } from 'react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Check } from 'lucide-react'

/** "Training complete!" burst from the design, with a one-shot confetti pop. */
export default function CompletionHero({ xp }: { xp: number }) {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const t = setTimeout(() => {
      void confetti({ particleCount: 90, spread: 75, origin: { y: 0.3 }, colors: ['#ff5f1a', '#ff8a3d', '#ffffff', '#e8421a'] })
    }, 350)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="relative -mx-4 flex flex-col items-center overflow-hidden px-6 pb-8 pt-10 text-center">
      {/* Light rays */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-24 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 opacity-60"
        style={{
          background: 'repeating-conic-gradient(from 0deg, hsl(0 0% 100% / 0.07) 0deg 9deg, transparent 9deg 22deg)',
          maskImage: 'radial-gradient(circle, black 18%, transparent 62%)',
          WebkitMaskImage: 'radial-gradient(circle, black 18%, transparent 62%)',
        }}
      />
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 12, stiffness: 180 }}
        className="relative flex h-28 w-28 items-center justify-center rounded-full bg-primary shadow-[0_0_60px_hsl(var(--primary)/0.55)]"
      >
        <Check size={56} strokeWidth={3} className="text-white" />
      </motion.div>
      <h1 className="relative mt-8 text-3xl font-bold">Training complete!</h1>
      <p className="relative mt-2 text-muted-foreground">Great job! You crushed today’s session.</p>
      {xp > 0 && (
        <span className="relative mt-4 rounded-full bg-primary/15 px-3 py-1 text-sm font-semibold text-primary">+{xp} XP</span>
      )}
    </div>
  )
}
