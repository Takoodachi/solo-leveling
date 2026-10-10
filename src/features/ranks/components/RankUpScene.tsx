import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { buzz } from '@/lib/haptics'
import type { RankUp } from '../computeRanks'
import { centered, ceremonyKind, KIND_LABEL, sceneSubject, sceneTiming, sceneXp, tint } from '../rankUpCeremony'
import RankBadge from './RankBadge'
import { Burst, ChargeRing, Glow, Rays } from './RankUpEffects'

const DIVISIONS = ['III', 'II', 'I'] as const

function subline(up: RankUp): string {
  if (up.from) return `Up from ${up.from.label}`
  if (up.id === 'overall') return 'Your overall rank is unlocked'
  return up.id === 'running' ? 'Your first ranked run' : 'Your first rank on this lift'
}

/**
 * One rank-up, start to finish: the old emblem (greyed out for a first rank) shakes while a ring
 * fills around it, a flash throws it off, and the new one lands with its name. Timed by
 * `sceneTiming`; the stage (RankUpCeremony) moves on when the time is up.
 */
export default function RankUpScene({ up }: { up: RankUp }) {
  const kind = ceremonyKind(up)
  const t = sceneTiming(up)
  const color = up.to.tier.color
  const size = up.id === 'overall' ? 184 : 164
  const xp = sceneXp(up)
  const gone = t.burst + 0.14
  const reached = up.to.division ? DIVISIONS.indexOf(up.to.division) : -1

  useEffect(() => {
    const timer = setTimeout(() => buzz(kind === 'division' ? 30 : [25, 60, 45]), t.burst * 1000)
    return () => clearTimeout(timer)
  }, [kind, t.burst])

  return (
    <motion.div
      className="relative flex w-full max-w-sm flex-col items-center px-6 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.06 }}
      transition={{ duration: 0.25 }}
    >
      <motion.p
        className="text-[13px] font-semibold uppercase tracking-[0.32em]"
        style={{ color }}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.35 }}
      >
        {KIND_LABEL[kind]}
      </motion.p>
      <motion.p
        className="mt-1.5 font-heading text-xl font-semibold text-zinc-100"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.35 }}
      >
        {sceneSubject(up)}
      </motion.p>

      <div className="relative my-5 h-[264px] w-[264px]">
        <Rays color={color} t={t} />
        <Glow color={color} t={t} />
        <ChargeRing color={color} t={t} size={252} />

        {/* What you had: shakes harder as the ring fills, then is thrown off by the flash */}
        <motion.div
          style={centered(size)}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0.8, 1, 1, 1.55] }}
          transition={{ duration: gone, times: [0, 0.3 / gone, t.burst / gone, 1], ease: 'linear' }}
        >
          <motion.div
            animate={{ x: [0, -1, 1, -2, 2, -3, 3, -4, 4, 0], y: [0, 1, -1, 1, -2, 2, -2, 3, -3, 0] }}
            transition={{ delay: t.charge, duration: t.burst - t.charge, ease: 'linear' }}
          >
            <RankBadge tier={(up.from ?? up.to).tier.key} size={size} locked={!up.from} />
          </motion.div>
        </motion.div>

        <Burst color={color} t={t} />

        {/* What you've earned: lands from close up, then floats */}
        <motion.div
          style={centered(size)}
          initial={{ opacity: 0, scale: kind === 'division' ? 1.4 : 2.4, rotate: kind === 'division' ? 0 : -10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ delay: t.burst + 0.04, type: 'spring', stiffness: 230, damping: 13, opacity: { delay: t.burst + 0.04, duration: 0.12 } }}
        >
          <motion.div
            style={{ filter: `drop-shadow(0 0 26px ${tint(color, 55)})` }}
            animate={{ y: [0, -5, 0] }}
            transition={{ delay: t.burst + 0.8, duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <RankBadge tier={up.to.tier.key} size={size} />
          </motion.div>
        </motion.div>
      </div>

      {/* The old name and the new one share a cell, so nothing jumps when they swap */}
      <div className="grid place-items-center [&>*]:col-start-1 [&>*]:row-start-1">
        <motion.p
          className="font-heading text-2xl font-semibold uppercase tracking-wide text-zinc-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: gone, times: [0, 0.3 / gone, t.burst / gone, 1], ease: 'linear' }}
        >
          {up.from?.label ?? 'Unranked'}
        </motion.p>
        <motion.h2
          className="font-heading text-4xl font-bold uppercase tracking-wide"
          style={{ color, textShadow: `0 0 30px ${tint(color, 60)}` }}
          initial={{ opacity: 0, y: 16, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: t.burst + 0.2, type: 'spring', stiffness: 260, damping: 18 }}
        >
          {up.to.label}
        </motion.h2>
      </div>

      <motion.div
        className="mt-2 flex min-h-[4.5rem] flex-col items-center gap-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: t.burst + 0.5, duration: 0.4 }}
      >
        <p className="flex items-center gap-2 text-sm text-zinc-400">
          {subline(up)}
          {xp > 0 && (
            <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: tint(color, 20), color }}>+{xp} XP</span>
          )}
        </p>
        {reached >= 0 && (
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {DIVISIONS.map((d, i) => (
              <motion.span
                key={d}
                className="flex h-6 min-w-9 items-center justify-center rounded-full border px-2 text-[11px] font-bold"
                style={i <= reached ? { backgroundColor: tint(color, 22), borderColor: tint(color, 45), color } : { borderColor: 'rgb(255 255 255 / 0.14)', color: '#71717a' }}
                animate={i === reached ? { scale: [1, 1.3, 1] } : undefined}
                transition={{ delay: t.burst + 0.75, duration: 0.45 }}
              >
                {d}
              </motion.span>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
