import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWorkoutsWithSummary } from '@/features/workouts/hooks/useWorkoutsWithSummary'
import WorkoutCard from '@/features/workouts/components/WorkoutCard'

export default function WorkoutHistoryPage() {
  const navigate = useNavigate()
  const workouts = useWorkoutsWithSummary()

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ChevronLeft size={18} />
        </Button>
        <h1 className="text-xl font-bold">History</h1>
      </div>

      <div className="flex flex-col gap-2">
        {workouts.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">No workouts yet</p>
        )}
        {workouts.map(w => (
          <WorkoutCard
            key={w.uuid}
            workout={w}
            setCount={w.setCount}
            exerciseNames={w.exerciseNames}
            onClick={() => navigate(`/workouts/${w.uuid}`)}
          />
        ))}
      </div>
    </div>
  )
}
