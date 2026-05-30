import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { DynamicBreakdown, DynamicTargets } from '@/lib/macroTargets'

interface Props {
  open: boolean
  onClose: () => void
  targets: DynamicTargets
  breakdown: DynamicBreakdown
}

export default function TargetBreakdownSheet({ open, onClose, targets, breakdown }: Props) {
  const stepsKcal = Math.round(breakdown.avgSteps * 0.0005 * breakdown.bodyKg)
  const workoutKcal = Math.round(breakdown.avgWorkoutMin * 6)

  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Today's target breakdown</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-4 text-sm">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Baseline
            </p>
            <p className="text-foreground/90">
              {breakdown.baseline.kcal} kcal · {breakdown.baseline.protein} g P · {breakdown.baseline.carbs} g C · {breakdown.baseline.fat} g F
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Activity bonus — {breakdown.windowDays}-day avg
            </p>
            {breakdown.activityAvg > 0 ? (
              <div className="flex flex-col gap-1 text-foreground/90">
                <p>+{breakdown.activityAvg} kcal/day</p>
                <p className="text-xs text-muted-foreground">
                  Steps avg: {breakdown.avgSteps.toLocaleString()} /day · ~{stepsKcal} kcal
                </p>
                <p className="text-xs text-muted-foreground">
                  Workouts avg: {breakdown.avgWorkoutMin} min/day · ~{workoutKcal} kcal
                </p>
                <p className="text-xs text-muted-foreground">
                  Body weight used: {breakdown.bodyKg} kg
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                No activity logged in the last {breakdown.windowDays} days. Target equals baseline.
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Today's target
            </p>
            <p className="text-foreground/90">
              {targets.kcal} kcal · {targets.protein} g P · {targets.carbs} g C · {targets.fat} g F
            </p>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
            Protein stays where you set it. Carbs and fat absorb the activity-driven kcal change in your baseline ratio.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
