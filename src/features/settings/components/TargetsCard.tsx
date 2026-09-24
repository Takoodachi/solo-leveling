import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import NumberStepper from '@/components/NumberStepper'
import { AVERAGE_BODY_KG, countsSteps } from '@/lib/stepCalories'
import { useSettings, DEFAULT_STEP_GOAL } from '../hooks/useSettings'
import TargetForm from './TargetForm'

export default function TargetsCard() {
  const { settings, updateSettings } = useSettings()

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl bg-card p-5">
        <TargetForm />
      </div>

      <div className="flex flex-col gap-4 rounded-3xl bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Label className="text-sm">Subtract step calories</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              What your steps burn comes off the calories you ate, worked out from your weight and height ({AVERAGE_BODY_KG} kg until you log a weight).
              Carbs and fat targets grow to match; protein stays. Workouts aren’t counted.
            </p>
          </div>
          <Switch checked={countsSteps(settings)} onCheckedChange={v => void updateSettings({ dynamicTargetsEnabled: v })} aria-label="Subtract step calories" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Daily step goal</Label>
          <NumberStepper
            value={String(settings?.dailyStepGoal ?? DEFAULT_STEP_GOAL)}
            step={500}
            min={500}
            max={50000}
            inputMode="numeric"
            onChange={v => void updateSettings({ dailyStepGoal: Math.max(500, Math.round(Number(v) || DEFAULT_STEP_GOAL)) })}
          />
        </div>
      </div>
    </div>
  )
}
