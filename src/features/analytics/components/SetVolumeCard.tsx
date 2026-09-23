import { useState } from 'react'
import { addDays, format, startOfWeek, subWeeks } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight, Info, SlidersHorizontal } from 'lucide-react'
import Segmented from '@/components/Segmented'
import { useNow } from '@/hooks/useNow'
import { toDateStr } from '@/lib/date'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { useMuscleVolume } from '../hooks/useMuscleVolume'
import {
  DEFAULT_RADAR, MIN_RADAR_MUSCLES, STATUS, TRAINING_LEVELS, VOLUME_MUSCLES, formatSets, landmarksOf, statusOf, thresholdsFor,
  type TrainingLevel, type VolumeMuscle,
} from '../volume'
import VolumeRadar from './VolumeRadar'
import VolumeBreakdown from './VolumeBreakdown'
import VolumeGuidelinesSheet from './VolumeGuidelinesSheet'
import CustomizeRadarSheet from './CustomizeRadarSheet'

const navBtn = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground disabled:opacity-30'

/** Weekly analysis: sets per muscle on a radar, coloured by where they sit against MEV / MAV / MRV. */
export default function SetVolumeCard() {
  const now = useNow()
  const { settings, updateSettings } = useSettings()
  const [weeksBack, setWeeksBack] = useState(0)
  const [active, setActive] = useState<VolumeMuscle | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const [customizeOpen, setCustomizeOpen] = useState(false)

  const start = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), weeksBack)
  const volume = useMuscleVolume(toDateStr(start))
  const level: TrainingLevel = settings?.trainingLevel ?? 'intermediate'
  const saved = (settings?.radarMuscles ?? []).filter(k => VOLUME_MUSCLES.some(m => m.key === k))
  const shown = saved.length >= MIN_RADAR_MUSCLES ? saved : [...DEFAULT_RADAR]

  const axes = shown.map(key => {
    const m = landmarksOf(key)
    const sets = Math.round((volume?.sets.get(key) ?? 0) * 2) / 2
    const t = thresholdsFor(key, level)
    return { key, label: m.short ?? m.label, name: m.label, sets, t, status: statusOf(sets, t) }
  })
  const focus = axes.find(a => a.key === active)

  return (
    <section className="rounded-3xl bg-card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-primary">Weekly analysis</p>
          <h2 className="font-heading text-2xl font-bold">Set volume</h2>
        </div>
        <button type="button" onClick={() => setGuideOpen(true)} className={navBtn} aria-label="Volume guidelines">
          <Info size={22} className="text-muted-foreground" />
        </button>
      </div>

      <Segmented
        size="sm"
        value={level}
        options={TRAINING_LEVELS}
        onChange={v => void updateSettings({ trainingLevel: v })}
        className="bg-secondary"
      />
      <p className="mt-2 px-1 text-xs text-muted-foreground">{TRAINING_LEVELS.find(l => l.value === level)?.blurb}</p>

      <div className="mt-4 flex items-center rounded-2xl bg-secondary">
        <button type="button" className={navBtn} onClick={() => setWeeksBack(w => w + 1)} aria-label="Previous week">
          <ChevronLeft size={20} />
        </button>
        <p className="flex flex-1 items-center justify-center gap-2 text-sm font-semibold uppercase tracking-wide tabular-nums">
          <CalendarDays size={16} className="text-muted-foreground" />
          {format(start, 'MMM d')} – {format(addDays(start, 6), 'MMM d')}
        </p>
        <button type="button" className={navBtn} disabled={weeksBack === 0} onClick={() => setWeeksBack(w => w - 1)} aria-label="Next week">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="-mx-4 mt-2">
        <VolumeRadar axes={axes} active={active} onActive={setActive} />
      </div>

      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {Object.values(STATUS).map(s => (
          <li key={s.label} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} /> {s.label}
          </li>
        ))}
      </ul>

      <div className="mt-3 min-h-11 rounded-2xl bg-secondary/60 px-4 py-2.5 text-center text-sm">
        {focus ? (
          <>
            <p><b>{focus.name}</b>: {formatSets(focus.sets)} sets · <span style={{ color: STATUS[focus.status].color }}>{STATUS[focus.status].label}</span></p>
            <p className="text-xs text-muted-foreground tabular-nums">MEV {focus.t.mev} · MAV {focus.t.mavLow}–{focus.t.mavHigh} · MRV {focus.t.mrv} sets / week</p>
          </>
        ) : volume && volume.totalSets > 0 ? (
          <p className="text-muted-foreground">
            {volume.totalSets} working sets in {volume.workouts} {volume.workouts === 1 ? 'workout' : 'workouts'}. Tap a muscle for its targets.
          </p>
        ) : (
          <p className="text-muted-foreground">No sets logged this week yet.</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => setCustomizeOpen(true)}
        className="mt-3 flex h-14 w-full items-center gap-3 rounded-2xl bg-secondary px-4 text-left"
      >
        <SlidersHorizontal size={18} className="text-muted-foreground" />
        <span className="flex-1 font-medium">Customize radar</span>
        <span className="rounded-lg bg-primary/15 px-2 py-0.5 text-sm font-semibold text-primary tabular-nums">{shown.length}</span>
        <ChevronRight size={18} className="text-muted-foreground" />
      </button>

      <h3 className="eyebrow mb-1 mt-5 text-muted-foreground">Muscle group distribution</h3>
      <VolumeBreakdown axes={axes} active={active} onActive={setActive} />

      <VolumeGuidelinesSheet open={guideOpen} onOpenChange={setGuideOpen} />
      <CustomizeRadarSheet
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        shown={shown}
        onChange={muscles => void updateSettings({ radarMuscles: muscles })}
      />
    </section>
  )
}
