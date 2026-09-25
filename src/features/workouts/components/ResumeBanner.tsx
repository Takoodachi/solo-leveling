import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { Play } from 'lucide-react'
import { useWorkoutStore } from '../store'
import { useElapsed } from '../hooks/useElapsed'

/** Shown on Home/Workouts while a session (or an edit of a saved one) is in progress. */
export default function ResumeBanner() {
  const draft = useWorkoutStore(s => s.draft)
  const editing = draft?.editing
  const elapsed = useElapsed(draft && !editing ? draft.startedAt : null)
  if (!draft) return null

  const done = draft.blocks.reduce((n, b) => n + b.sets.filter(s => s.done).length, 0)
  return (
    <Link
      to="/workouts/active"
      className="bg-brand-gradient flex items-center gap-3 rounded-3xl p-4 text-white shadow-lg shadow-primary/25 active:scale-[0.99]"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20">
        <Play size={20} className="ml-0.5 fill-white" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{draft.name}</p>
        <p className="text-sm text-white/80">
          {editing
            ? `Editing ${format(parseISO(editing.date), 'EEE d MMM')} · ${done} sets`
            : <><span className="tabular-nums">{elapsed.label}</span> · {done} sets done</>}
        </p>
      </div>
      <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">Resume</span>
    </Link>
  )
}
