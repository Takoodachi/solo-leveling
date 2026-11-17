import { Label } from '@/components/ui/label'
import Segmented from '@/components/Segmented'
import { useSettings } from '../hooks/useSettings'
import { unitsOf } from '../units'

/** Settings → Units: the unit every weight is shown and typed in, the body's and what's lifted, and the height's. */
export default function UnitsCard() {
  const { settings, updateSettings } = useSettings()
  const units = unitsOf(settings)
  return (
    <div className="flex flex-col gap-5 rounded-3xl bg-card p-5">
      <div id="units--weight" className="flex flex-col gap-1.5">
        <Label>Weight</Label>
        <Segmented
          size="sm"
          value={units.weight}
          options={[{ value: 'kg', label: 'Kilograms (kg)' }, { value: 'lb', label: 'Pounds (lb)' }]}
          onChange={weightUnit => void updateSettings({ weightUnit })}
          className="bg-secondary"
        />
        <p className="text-xs text-muted-foreground">Your body weight and what you lift. A lift switched to the other unit on its own card in a workout keeps that one.</p>
      </div>
      <div id="units--height" className="flex flex-col gap-1.5">
        <Label>Height</Label>
        <Segmented
          size="sm"
          value={units.height}
          options={[{ value: 'cm', label: 'Centimetres (cm)' }, { value: 'ftin', label: 'Feet and inches' }]}
          onChange={heightUnit => void updateSettings({ heightUnit })}
          className="bg-secondary"
        />
      </div>
    </div>
  )
}
