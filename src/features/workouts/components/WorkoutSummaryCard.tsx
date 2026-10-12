import type { WorkoutWithSets } from '@/types'
import { summaryStats } from '../summaryStats'
import MusclesWorked from './MusclesWorked'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-medium">{value}</p>
    </div>
  )
}

/** The summary's figures (summaryStats.ts) and the muscles the workout worked. */
export default function WorkoutSummaryCard({ workout }: { workout: WorkoutWithSets }) {
  const stats = summaryStats(workout)

  return (
    <section className="rounded-3xl bg-card p-5 ring-1 ring-foreground/5 dark:bg-black/60">
      <h2 className="mb-5 text-center text-xl font-semibold">Workout Summary</h2>
      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        {stats.map(([label, value]) => <Stat key={label} label={label} value={value} />)}
      </div>
      <div className="mt-6 empty:hidden">
        <MusclesWorked sets={workout.sets} />
      </div>
    </section>
  )
}
