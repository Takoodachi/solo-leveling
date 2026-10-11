import { useLiveQuery } from 'dexie-react-hooks'
import type { Exercise } from '@/types'
import { exerciseHistory } from '../exerciseHistory'

const heading = 'mb-1.5 mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground'

/** An exercise's past in its info sheet: the best it has seen and the latest sessions, set by set. */
export default function ExerciseHistory({ exercise }: { exercise: Exercise }) {
  const history = useLiveQuery(() => exerciseHistory(exercise), [exercise.uuid])
  if (!history) return null

  if (history.total === 0) {
    return (
      <>
        <h4 className={heading}>History</h4>
        <p className="text-sm text-muted-foreground">Not logged yet. Your sessions will show here.</p>
      </>
    )
  }

  const weighted = exercise.type !== 'cardio' && history.sessions.some(s => s.sets.some(text => text.includes('×')))
  return (
    <>
      {history.bests.length > 0 && (
        <>
          <h4 className={heading}>Best</h4>
          <ul className="flex flex-col gap-1.5 rounded-2xl bg-secondary px-3 py-2.5 text-sm">
            {history.bests.map(b => (
              <li key={b.label} className="flex items-baseline gap-2">
                <span className="w-16 shrink-0 text-xs text-muted-foreground">{b.label}</span>
                <span className="min-w-0 flex-1 font-semibold">{b.value}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{b.day}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h4 className={heading}>
        Last sessions{weighted && ` · ${history.unit} × reps`}
      </h4>
      <ul className="flex flex-col divide-y divide-foreground/5">
        {history.sessions.map(s => (
          <li key={s.workoutId} className="flex gap-3 py-2 text-sm first:pt-0 last:pb-0">
            <span className="w-20 shrink-0 text-muted-foreground">{s.day}</span>
            <span className="min-w-0 flex-1 font-medium">{s.sets.join('  ·  ')}</span>
          </li>
        ))}
      </ul>
      {history.total > history.sessions.length && (
        <p className="mt-2 text-xs text-muted-foreground">{history.total} sessions in all.</p>
      )}
    </>
  )
}
