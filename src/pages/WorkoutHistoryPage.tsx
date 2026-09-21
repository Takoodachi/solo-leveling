import FullScreen from '@/components/FullScreen'
import PageHeader from '@/components/PageHeader'
import { useWorkoutList } from '@/features/workouts/hooks/useWorkoutHistory'
import WorkoutHistoryRow from '@/features/workouts/components/WorkoutHistoryRow'

export default function WorkoutHistoryPage() {
  const workouts = useWorkoutList()

  return (
    <FullScreen className="flex flex-col gap-3">
      <PageHeader back="/workouts" title="History" />
      {workouts?.length === 0 && (
        <p className="rounded-3xl bg-card p-6 text-center text-sm text-muted-foreground">No workouts logged yet.</p>
      )}
      {workouts?.map(w => <WorkoutHistoryRow key={w.uuid} workout={w} />)}
    </FullScreen>
  )
}
