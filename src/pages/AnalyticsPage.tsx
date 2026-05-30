import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  useTrainedExercises,
  useStrengthAnalytics,
  useMacroAdherence,
  type StrengthRange,
} from '@/features/analytics/hooks/useAnalyticsData'
import ExercisePicker from '@/features/analytics/components/ExercisePicker'
import RangeToggle from '@/features/analytics/components/RangeToggle'
import VolumeLoadChart from '@/features/analytics/components/VolumeLoadChart'
import OneRmChart from '@/features/analytics/components/OneRmChart'
import MacroAdherenceChart from '@/features/analytics/components/MacroAdherenceChart'
import { cn } from '@/lib/utils'

type MacroView = 'week' | 'month'

export default function AnalyticsPage() {
  const navigate = useNavigate()
  const trained = useTrainedExercises()
  const [exerciseId, setExerciseId] = useState<string | null>(null)
  const [range, setRange] = useState<StrengthRange>(90)
  const [macroView, setMacroView] = useState<MacroView>('week')

  useEffect(() => {
    if (!exerciseId && trained.length > 0) setExerciseId(trained[0].exercise.uuid)
  }, [trained, exerciseId])

  const strength = useStrengthAnalytics(exerciseId, range)
  const macro = useMacroAdherence(macroView === 'week' ? 7 : 30)
  const selectedExerciseName =
    trained.find(t => t.exercise.uuid === exerciseId)?.exercise.name ?? null

  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ChevronLeft size={18} />
        </Button>
        <h1 className="text-xl font-bold">Analytics</h1>
      </div>

      {/* Strength controls (shared across the two strength charts) */}
      <Card>
        <CardContent className="p-4 flex flex-col gap-3">
          {trained.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Log a few workouts to see strength progression.
            </p>
          ) : (
            <>
              <ExercisePicker
                exercises={trained}
                value={exerciseId}
                onChange={setExerciseId}
              />
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Range</span>
                <RangeToggle value={range} onChange={setRange} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Volume-Load Trend */}
      {trained.length > 0 && (
        <Card>
          <CardContent className="p-4 flex flex-col gap-2">
            <div>
              <h2 className="font-medium text-sm">Volume load</h2>
              <p className="text-xs text-muted-foreground">
                {selectedExerciseName ?? 'Pick an exercise'} · sum of weight × reps per session
              </p>
            </div>
            <VolumeLoadChart data={strength.volume} />
          </CardContent>
        </Card>
      )}

      {/* 1RM Progression */}
      {trained.length > 0 && (
        <Card>
          <CardContent className="p-4 flex flex-col gap-2">
            <div>
              <h2 className="font-medium text-sm">Estimated 1RM</h2>
              <p className="text-xs text-muted-foreground">
                {selectedExerciseName ?? 'Pick an exercise'} · top-set Epley estimate per session
              </p>
            </div>
            <OneRmChart data={strength.oneRm} />
          </CardContent>
        </Card>
      )}

      {/* Macro Adherence */}
      <Card>
        <CardContent className="p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-medium text-sm">Macro adherence</h2>
              <p className="text-xs text-muted-foreground">
                Stacked kcal by macro vs. current target ({macro.targetKcal} kcal)
              </p>
            </div>
            <div className="flex gap-1 p-0.5 bg-muted rounded-md shrink-0">
              {(['week', 'month'] as const).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setMacroView(v)}
                  className={cn(
                    'px-3 py-1 rounded text-xs font-medium transition-colors capitalize',
                    macroView === v
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground',
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          {macro.hasData ? (
            <MacroAdherenceChart data={macro.rows} targetKcal={macro.targetKcal} />
          ) : (
            <p className="text-xs text-muted-foreground text-center py-8">
              No food logs in the last {macroView === 'week' ? '7' : '30'} days.
            </p>
          )}
          <p className="text-[10px] text-muted-foreground">
            Target line uses your current effective target. Past days are compared to today's goal.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
