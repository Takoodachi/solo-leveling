import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import NumberStepper from '@/components/NumberStepper'
import Segmented from '@/components/Segmented'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { useBodyMetrics } from '@/features/bodyMetrics/useBodyMetrics'
import { today } from '@/lib/date'
import type { RanksSnapshot } from '../computeRanks'
import type { Sex } from '../standards'
import { bodyKg, useUnits } from '@/features/settings/units'

/** Ranks are scored against lifters of your sex and bodyweight, so ask for both once. */
export default function RankSetupCard({ ranks }: { ranks: RanksSnapshot }) {
  const { updateSettings } = useSettings()
  const { logWeight } = useBodyMetrics(1)
  const [sex, setSex] = useState<Sex | ''>(ranks.sex ?? '')
  const unit = useUnits(s => s.weight)
  const [weight, setWeight] = useState('')
  const kg = bodyKg(Number(weight.replace(',', '.')), unit)
  const valid = sex !== '' && kg >= 30 && kg <= 300

  async function save() {
    if (!valid) return
    if (sex !== ranks.sex) await updateSettings({ sex })
    if (ranks.bodyKg == null) await logWeight(today(), kg)
    toast.success('Ranks unlocked')
  }

  return (
    <section className="flex flex-col gap-4 rounded-3xl bg-card p-5">
      <div>
        <h2 className="font-semibold">Unlock your ranks</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every set is rated against lifters of your sex and bodyweight. You can change these later in Profile.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Biological sex</Label>
        <Segmented size="sm" value={sex as Sex} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} onChange={setSex} className="bg-secondary" />
      </div>
      {ranks.bodyKg == null && (
        <div className="flex flex-col gap-1.5">
          <Label>Body weight today ({unit})</Label>
          <NumberStepper value={weight} onChange={setWeight} step={unit === 'lb' ? 1 : 0.5} min={unit === 'lb' ? 66 : 30} max={unit === 'lb' ? 660 : 300} inputMode="decimal" placeholder={unit === 'lb' ? '165' : '75'} />
        </div>
      )}
      <Button disabled={!valid} onClick={() => void save()}>Show my ranks</Button>
    </section>
  )
}
