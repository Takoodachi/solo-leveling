import { motion } from 'framer-motion'
import { centered, tint, type SceneTiming } from '../rankUpCeremony'

/**
 * The light show around the emblem in a rank-up scene. Keyframes with `times` run on a linear
 * clock: the browser eases a whole opacity timeline, not each step, and would start fades early.
 */

interface FxProps {
  color: string
  t: SceneTiming
}

const RAY_MASK = 'radial-gradient(circle, black 10%, transparent 62%)'

/** Slowly turning rays behind the emblem: faint while it charges, full once the rank lands. */
export function Rays({ color, t }: FxProps) {
  const total = t.burst + 0.3
  return (
    <motion.div
      aria-hidden="true"
      style={{
        ...centered(760),
        background: `repeating-conic-gradient(from 0deg, ${tint(color, 28)} 0deg 6deg, transparent 6deg 20deg)`,
        maskImage: RAY_MASK,
        WebkitMaskImage: RAY_MASK,
      }}
      initial={{ opacity: 0, rotate: 0 }}
      animate={{ opacity: [0, 0.25, 1], rotate: 360 }}
      transition={{
        opacity: { duration: total, times: [0, t.burst / total, 1], ease: 'linear' },
        rotate: { duration: 40, ease: 'linear', repeat: Infinity },
      }}
    />
  )
}

/** Soft pool of the tier's colour under everything. */
export function Glow({ color, t }: FxProps) {
  const total = t.burst + 0.4
  return (
    <motion.div
      aria-hidden="true"
      className="rounded-full"
      style={{ ...centered(440), background: `radial-gradient(circle, ${tint(color, 42)} 0%, transparent 66%)` }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: [0, 0.3, 1], scale: [0.6, 0.8, 1] }}
      transition={{ duration: total, times: [0, t.burst / total, 1], ease: 'linear' }}
    />
  )
}

/** The ring that fills around the old emblem, then lets go at the flash. */
export function ChargeRing({ color, t, size }: FxProps & { size: number }) {
  const total = t.burst + 0.18
  return (
    <motion.svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      style={centered(size)}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [0.92, 1, 1, 1.3] }}
      transition={{ duration: total, times: [0, 0.2, t.burst / total, 1], ease: 'linear' }}
    >
      <circle cx="50" cy="50" r="47" fill="none" stroke={tint(color, 20)} strokeWidth="1" />
      <g transform="rotate(-90 50 50)">
        <motion.circle
          cx="50" cy="50" r="47" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: t.charge, duration: t.burst - t.charge, ease: 'easeIn' }}
        />
      </g>
    </motion.svg>
  )
}

// Golden-angle spread, so the sparks look scattered without Math.random in a render
const SPARKS = Array.from({ length: 18 }, (_, i) => {
  const deg = (i * 137.5) % 360
  const angle = (deg * Math.PI) / 180
  const reach = 118 + (i % 4) * 30
  return { x: Math.cos(angle) * reach, y: Math.sin(angle) * reach, deg, streak: i % 3 === 0, white: i % 2 === 0, time: 0.65 + (i % 3) * 0.16 }
})

/** The moment the new rank lands: a flash, two shock rings and sparks thrown outwards. */
export function Burst({ color, t }: FxProps) {
  return (
    <>
      <motion.div
        aria-hidden="true"
        className="rounded-full"
        style={{ ...centered(230), background: `radial-gradient(circle, #fff 0%, ${tint(color, 75)} 32%, transparent 70%)` }}
        initial={{ opacity: 0, scale: 0.2 }}
        animate={{ opacity: [0, 1, 0], scale: [0.2, 1.2, 2.9] }}
        transition={{ delay: t.burst - 0.04, duration: 0.6, times: [0, 0.12, 1], ease: 'easeOut' }}
      />
      {[0, 0.15].map(late => (
        <motion.div
          key={late}
          aria-hidden="true"
          className="rounded-full border-2"
          style={{ ...centered(170), borderColor: color }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: [0, 0.9, 0], scale: [0.5, 1, 3.3] }}
          transition={{ delay: t.burst + late, duration: 0.95, times: [0, 0.1, 1], ease: 'easeOut' }}
        />
      ))}
      {SPARKS.map((s, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          className="rounded-full"
          style={{
            position: 'absolute', left: '50%', top: '50%',
            width: s.streak ? 3 : 6, height: s.streak ? 16 : 6,
            marginLeft: s.streak ? -1.5 : -3, marginTop: s.streak ? -8 : -3,
            background: s.white ? '#fff' : color,
            rotate: s.deg + 90,
          }}
          initial={{ opacity: 0, x: 0, y: 0, scale: 1 }}
          animate={{ opacity: [0, 1, 0], x: [0, s.x * 0.5, s.x], y: [0, s.y * 0.5, s.y], scale: [1, 1, 0.3] }}
          transition={{ delay: t.burst, duration: s.time, times: [0, 0.15, 1], ease: 'easeOut' }}
        />
      ))}
    </>
  )
}

// One chevron of the app's mark (components/Logo.tsx)
const CHEVRON = 'M50,20 L80,50 L67,50 L50,33 L33,50 L20,50 Z'
const RISERS = [
  { left: 6, size: 20, time: 2.6, delay: 0.1, alpha: 0.3 },
  { left: 17, size: 34, time: 3.4, delay: 1.0, alpha: 0.16 },
  { left: 29, size: 16, time: 2.2, delay: 0.5, alpha: 0.38 },
  { left: 41, size: 26, time: 3.0, delay: 1.7, alpha: 0.2 },
  { left: 54, size: 18, time: 2.4, delay: 0.25, alpha: 0.34 },
  { left: 65, size: 38, time: 3.6, delay: 1.3, alpha: 0.14 },
  { left: 76, size: 16, time: 2.1, delay: 0.75, alpha: 0.4 },
  { left: 87, size: 24, time: 2.8, delay: 0, alpha: 0.24 },
]

/** The mark's chevrons rising up the whole stage for as long as it's open: the "ascent". */
export function RisingChevrons({ color }: { color: string }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {RISERS.map(r => (
        <motion.svg
          key={r.left}
          viewBox="18 18 64 34"
          width={r.size}
          height={(r.size * 34) / 64}
          className="absolute bottom-0"
          style={{ left: `${r.left}%`, fill: color }}
          initial={{ y: '8vh', opacity: 0 }}
          animate={{ y: ['8vh', '-104vh'], opacity: [0, r.alpha, r.alpha, 0] }}
          transition={{
            y: { duration: r.time, delay: r.delay, repeat: Infinity, ease: 'easeIn' },
            opacity: { duration: r.time, delay: r.delay, repeat: Infinity, times: [0, 0.2, 0.75, 1], ease: 'linear' },
          }}
        >
          <path d={CHEVRON} />
        </motion.svg>
      ))}
    </div>
  )
}
