import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { RotateCcw, X } from 'lucide-react'
import { liftPlateaus, plateauWhy, showsPlateaus, type LiftPlateau } from '../plateau'

const SEEN_KEY = 'solo:plateausSeen'
const keyOf = (p: LiftPlateau) => `${p.exerciseId}:${p.since}`

function readSeen(): string[] {
  try {
    const seen: unknown = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]')
    return Array.isArray(seen) ? seen : []
  } catch {
    return []
  }
}

function writeSeen(keys: string[]) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(keys))
  } catch {
    // it just shows again next time
  }
}

/** Home: the lifts that have plateaued and the weight to reset to, until they move again or it's dismissed (plateau.ts). */
export default function PlateauCard({ today }: { today: string }) {
  // null while the tips are off or training is paused: nothing shows, and nothing dismissed is forgotten
  const plateaus = useLiveQuery(async () => ((await showsPlateaus(today)) ? liftPlateaus() : null), [today])
  const [seen, setSeen] = useState(readSeen)
  // A dismissed plateau that's over (the lift moved) is forgotten, so the next one on that lift shows
  useEffect(() => {
    if (!plateaus) return
    const stored = readSeen()
    const kept = stored.filter(k => plateaus.some(p => keyOf(p) === k))
    if (kept.length < stored.length) writeSeen(kept)
  }, [plateaus])
  const shown = plateaus?.filter(p => !seen.includes(keyOf(p))) ?? []
  if (!plateaus || shown.length === 0) return null

  // Dismissed until the next plateau: every one on show now
  const dismiss = () => {
    const keys = plateaus.map(keyOf)
    writeSeen(keys)
    setSeen(keys)
  }

  return (
    <section className="flex flex-col gap-3 rounded-3xl bg-card p-5" aria-label="Plateau">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"><RotateCcw size={20} /></span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-muted-foreground">Plateau</p>
          <p className="font-semibold">Time for a reset</p>
        </div>
        <button type="button" onClick={dismiss} className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent" aria-label="Dismiss plateau">
          <X size={18} />
        </button>
      </div>
      <ul className="flex flex-col gap-2 rounded-2xl bg-secondary px-4 py-3">
        {shown.map(p => (
          <li key={p.exerciseId} className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate">{p.name}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{p.from} → <span className="font-semibold text-foreground">{p.to} {p.unit}</span></span>
          </li>
        ))}
      </ul>
      <p className="text-xs leading-relaxed text-muted-foreground">{plateauWhy(shown)}</p>
    </section>
  )
}
