import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTargets } from '@/features/nutrition/hooks/useTargets'

const schema = z.object({
  dailyKcal:    z.number({ error: 'Required' }).min(0),
  dailyProtein: z.number({ error: 'Required' }).min(0),
  dailyCarbs:   z.number({ error: 'Required' }).min(0),
  dailyFat:     z.number({ error: 'Required' }).min(0),
})

type FormValues = z.infer<typeof schema>

export default function TargetForm() {
  const { targets, updateTargets } = useTargets()
  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { dailyKcal: 2000, dailyProtein: 150, dailyCarbs: 200, dailyFat: 65 },
  })

  useEffect(() => {
    if (targets) {
      reset({
        dailyKcal:    targets.dailyKcal,
        dailyProtein: targets.dailyProtein,
        dailyCarbs:   targets.dailyCarbs,
        dailyFat:     targets.dailyFat,
      })
    }
  }, [targets, reset])

  async function onSubmit(data: FormValues) {
    await updateTargets(data)
    toast.success('Targets saved')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 flex flex-col gap-1">
          <Label>Daily Calories (kcal)</Label>
          <Input type="number" inputMode="numeric" {...register('dailyKcal', { valueAsNumber: true })} />
          {errors.dailyKcal && <p className="text-xs text-destructive">{errors.dailyKcal.message}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <Label>Protein (g)</Label>
          <Input type="number" inputMode="numeric" {...register('dailyProtein', { valueAsNumber: true })} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Carbs (g)</Label>
          <Input type="number" inputMode="numeric" {...register('dailyCarbs', { valueAsNumber: true })} />
        </div>
        <div className="col-span-2 flex flex-col gap-1">
          <Label>Fat (g)</Label>
          <Input type="number" inputMode="numeric" {...register('dailyFat', { valueAsNumber: true })} />
        </div>
      </div>
      <Button type="submit" disabled={isSubmitting || !isDirty}>Save targets</Button>
    </form>
  )
}
