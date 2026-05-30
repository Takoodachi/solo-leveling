import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useFoods } from '../hooks/useFoods'
import { macrosFromIngredients, totalGrams } from '@/lib/macroCalc'
import IngredientRow from './IngredientRow'
import IngredientPicker from './IngredientPicker'
import type { FoodIngredient } from '@/types'

const directSchema = z.object({
  name:           z.string().min(1, 'Name is required'),
  kcalPerServing: z.number({ error: 'Required' }).min(0),
  protein:        z.number({ error: 'Required' }).min(0),
  carbs:          z.number({ error: 'Required' }).min(0),
  fat:            z.number({ error: 'Required' }).min(0),
  servingSize:    z.number({ error: 'Required' }).positive(),
  servingUnit:    z.string().min(1, 'Unit is required'),
})

type DirectValues = z.infer<typeof directSchema>

interface Props {
  onSuccess: () => void
  onCancel: () => void
}

export default function CustomFoodForm({ onSuccess, onCancel }: Props) {
  const { addCustomFood, foods } = useFoods()
  const [mode, setMode] = useState<'direct' | 'recipe'>('direct')

  return (
    <Tabs value={mode} onValueChange={v => setMode(v as 'direct' | 'recipe')} className="w-full">
      <TabsList className="grid grid-cols-2 w-full">
        <TabsTrigger value="direct">Direct</TabsTrigger>
        <TabsTrigger value="recipe">Recipe</TabsTrigger>
      </TabsList>

      <TabsContent value="direct">
        <DirectForm onSuccess={onSuccess} onCancel={onCancel} addCustomFood={addCustomFood} />
      </TabsContent>

      <TabsContent value="recipe">
        <RecipeForm onSuccess={onSuccess} onCancel={onCancel} addCustomFood={addCustomFood} foods={foods} />
      </TabsContent>
    </Tabs>
  )
}

// ── Direct (existing) form ────────────────────────────────────────────
function DirectForm({
  onSuccess,
  onCancel,
  addCustomFood,
}: {
  onSuccess: () => void
  onCancel: () => void
  addCustomFood: ReturnType<typeof useFoods>['addCustomFood']
}) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<DirectValues>({
    resolver: zodResolver(directSchema),
    defaultValues: { servingSize: 100, servingUnit: 'g' },
  })

  async function onSubmit(data: DirectValues) {
    await addCustomFood({ ...data, isFavorite: false })
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 mt-3">
      <div className="flex flex-col gap-1">
        <Label>Name</Label>
        <Input {...register('name')} placeholder="e.g. My Protein Shake" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label>Calories</Label>
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

// ── Recipe (ingredient-composed) form ─────────────────────────────────
function RecipeForm({
  onSuccess,
  onCancel,
  addCustomFood,
  foods,
}: {
  onSuccess: () => void
  onCancel: () => void
  addCustomFood: ReturnType<typeof useFoods>['addCustomFood']
  foods: ReturnType<typeof useFoods>['foods']
}) {
  const [name, setName] = useState('')
  const [ingredients, setIngredients] = useState<FoodIngredient[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const foodMap = useMemo(() => {
    const m = new Map<string, typeof foods[number]>()
    for (const f of foods) m.set(f.uuid, f)
    return m
  }, [foods])

  const totals = useMemo(
    () => macrosFromIngredients(ingredients, uuid => foodMap.get(uuid)),
    [ingredients, foodMap],
  )

  const totalG = totalGrams(ingredients)

  function updateGrams(idx: number, grams: number) {
    setIngredients(prev => prev.map((ing, i) => (i === idx ? { ...ing, grams } : ing)))
  }

  function deleteIngredient(idx: number) {
    setIngredients(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSave() {
    if (!name.trim() || ingredients.length === 0 || totalG <= 0) return
    setSaving(true)
    try {
      await addCustomFood({
        name: name.trim(),
        kcalPerServing: totals.kcal,
        protein: totals.protein,
        carbs: totals.carbs,
        fat: totals.fat,
        servingSize: totalG,
        servingUnit: 'g',
        isFavorite: false,
        ingredients,
      })
      onSuccess()
    } finally {
      setSaving(false)
    }
  }

  const canSave = name.trim().length > 0 && ingredients.length > 0 && totalG > 0

  return (
    <div className="flex flex-col gap-3 mt-3">
      <div className="flex flex-col gap-1">
        <Label>Name</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Breakfast Bowl" />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <Label>Ingredients</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1 h-7 text-xs"
            onClick={() => setPickerOpen(true)}
          >
            <Plus size={12} /> Add
          </Button>
        </div>

        {ingredients.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center border border-dashed border-border rounded-md">
            No ingredients yet
          </p>
        ) : (
          <div className="flex flex-col rounded-md border border-border">
            {ingredients.map((ing, idx) => (
              <IngredientRow
                key={`${ing.foodUuid}-${idx}`}
                ingredient={ing}
                source={foodMap.get(ing.foodUuid)}
                onChange={g => updateGrams(idx, g)}
                onDelete={() => deleteIngredient(idx)}
              />
            ))}
          </div>
        )}
      </div>

      {ingredients.length > 0 && (
        <div className="text-xs bg-muted/50 rounded p-2 flex flex-col gap-1">
          <div className="flex justify-between text-muted-foreground">
            <span>Total: {Math.round(totalG)} g</span>
            <span><span className="text-foreground font-medium">{totals.kcal}</span> cal</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>P <span className="text-foreground font-medium">{totals.protein}</span> g</span>
            <span>C <span className="text-foreground font-medium">{totals.carbs}</span> g</span>
            <span>F <span className="text-foreground font-medium">{totals.fat}</span> g</span>
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-1">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button type="button" className="flex-1" onClick={handleSave} disabled={!canSave || saving}>
          Save
        </Button>
      </div>

      <IngredientPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={ing => setIngredients(prev => [...prev, ing])}
      />
    </div>
  )
}
