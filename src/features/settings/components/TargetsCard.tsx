import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import NumberStepper from '@/components/NumberStepper'
import Segmented from '@/components/Segmented'
import { useSettings, DEFAULT_STEP_GOAL } from '../hooks/useSettings'
import TargetForm from './TargetForm'

export default function TargetsCard() {
  const { settings, updateSettings } = useSettings()
  const dynamicOn = settings?.dynamicTargetsEnabled ?? false

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl bg-card p-5">
        <TargetForm />
      </div>

      <div className="flex flex-col gap-4 rounded-3xl bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Label className="text-sm">Activity-driven targets</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">Adds carbs and fat based on your recent steps. Protein stays where you set it.</p>
          </div>
          <Switch checked={dynamicOn} onCheckedChange={v => void updateSettings({ dynamicTargetsEnabled: v })} aria-label="Activity-driven targets" />
        </div>
        {dynamicOn && (
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Rolling window</Label>
            <Segmented
              size="sm"
              className="bg-secondary"
              value={String(settings?.activityWindowDays ?? 7) as '3' | '5' | '7'}
              options={[{ value: '3', label: '3 days' }, { value: '5', label: '5 days' }, { value: '7', label: '7 days' }]}
              onChange={v => void updateSettings({ activityWindowDays: Number(v) })}
            />
          </div>
        )}
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
