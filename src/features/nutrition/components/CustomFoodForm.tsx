import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useFoods } from '../hooks/useFoods'

const schema = z.object({
  name:           z.string().min(1, 'Name is required'),
  kcalPerServing: z.number({ error: 'Required' }).min(0),
  protein:        z.number({ error: 'Required' }).min(0),
  carbs:          z.number({ error: 'Required' }).min(0),
  fat:            z.number({ error: 'Required' }).min(0),
  servingSize:    z.number({ error: 'Required' }).positive(),
  servingUnit:    z.string().min(1, 'Unit is required'),
})

type FormValues = z.infer<typeof schema>

interface Props {
  onSuccess: () => void
  onCancel: () => void
}

export default function CustomFoodForm({ onSuccess, onCancel }: Props) {
  const { addCustomFood } = useFoods()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { servingSize: 100, servingUnit: 'g' },
  })

  async function onSubmit(data: FormValues) {
    await addCustomFood({ ...data, isFavorite: false })
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label>Name</Label>
        <Input {...register('name')} placeholder="e.g. My Protein Shake" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label>Calories (kcal)</Label>
          <Input type="number" inputMode="decimal" {...register('kcalPerServing', { valueAsNumber: true })} />
          {errors.kcalPerServing && <p className="text-xs text-destructive">{errors.kcalPerServing.message}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <Label>Protein (g)</Label>
          <Input type="number" inputMode="decimal" {...register('protein', { valueAsNumber: true })} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Carbs (g)</Label>
          <Input type="number" inputMode="decimal" {...register('carbs', { valueAsNumber: true })} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Fat (g)</Label>
          <Input type="number" inputMode="decimal" {...register('fat', { valueAsNumber: true })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label>Serving size</Label>
          <Input type="number" inputMode="decimal" {...register('servingSize', { valueAsNumber: true })} />
          {errors.servingSize && <p className="text-xs text-destructive">{errors.servingSize.message}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <Label>Unit</Label>
          <Input {...register('servingUnit')} placeholder="g / ml / piece" />
        </div>
      </div>

      <div className="flex gap-2 mt-1">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="flex-1" disabled={isSubmitting}>Save</Button>
      </div>
    </form>
  )
}
