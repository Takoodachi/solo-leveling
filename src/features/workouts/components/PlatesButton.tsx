import { useState } from 'react'
import { Disc } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import Segmented from '@/components/Segmented'
import type { WeightUnit } from '@/types'
import { parsePositive } from '../types'
import { BARS, platesFor } from '../plates'

// How tall each plate is drawn, as a share of the biggest
const HEIGHT: Record<WeightUnit, Record<number, number>> = {
  kg: { 25: 100, 20: 100, 15: 88, 10: 76, 5: 60, 2.5: 48, 1.25: 40 },
  lb: { 45: 100, 35: 92, 25: 80, 10: 64, 5: 52, 2.5: 44 },
}

const barKey = (unit: WeightUnit) => `solo:plateBar:${unit}`
const num = (n: number) => String(Math.round(n * 100) / 100)

/** The bar picked last on this phone, for this unit. */
function savedBar(unit: WeightUnit): number {
  try {
    const bar = Number(localStorage.getItem(barKey(unit)))
    return BARS[unit].includes(bar) ? bar : BARS[unit][0]
  } catch {
    return BARS[unit][0]
  }
}

/** A barbell lift's "Plates" button in the logger: what to load on each side for the next set's weight. */
export default function PlatesButton({ unit, weight }: { unit: WeightUnit; weight: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-secondary px-4 text-sm font-semibold hover:bg-accent"
      >
        <Disc size={16} /> Plates
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        {/* Focus the sheet, not the field: a keyboard coming up would cover the answer */}
        <SheetContent side="bottom" className="px-5" onOpenAutoFocus={e => { e.preventDefault(); (e.currentTarget as HTMLElement).focus() }}>
          <SheetHeader className="mb-4 text-left">
            <SheetTitle className="text-xl">Plate calculator</SheetTitle>
            <SheetDescription>What goes on each side of the bar.</SheetDescription>
          </SheetHeader>
          {/* Mounted afresh each time the sheet opens, so it starts from the set's weight */}
          <Calculator unit={unit} initial={weight} />
        </SheetContent>
      </Sheet>
    </>
  )
}

function Calculator({ unit, initial }: { unit: WeightUnit; initial: string }) {
  const [text, setText] = useState(initial)
  const [bar, setBar] = useState(() => savedBar(unit))
  const total = parsePositive(text)
  const result = total != null && total >= bar ? platesFor(total, bar, unit) : null

  function chooseBar(value: string) {
    setBar(Number(value))
    try {
      localStorage.setItem(barKey(unit), value)
    } catch {
      // asked again next time
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-2">
      <label className="flex items-center gap-2">
        <span className="sr-only">Weight on the bar</span>
        <Input value={text} onChange={e => setText(e.target.value)} inputMode="decimal" placeholder="Weight" className="text-lg font-semibold" />
        <span className="shrink-0 text-muted-foreground">{unit}</span>
      </label>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bar</span>
        <Segmented size="sm" value={String(bar)} options={BARS[unit].map(b => ({ value: String(b), label: `${b} ${unit}` }))} onChange={chooseBar} />
      </div>

      <div className="flex min-h-40 flex-col justify-center gap-3 rounded-2xl bg-secondary p-4">
        {total == null ? (
          <p className="text-center text-sm text-muted-foreground">Type the weight you want on the bar.</p>
        ) : !result ? (
          <p className="text-center text-sm text-muted-foreground">That’s lighter than the bar.</p>
        ) : result.perSide.length === 0 ? (
          <p className="text-center font-semibold">Just the bar</p>
        ) : (
          <>
            {/* The bar's sleeve from the collar out, plates in the order they go on */}
            <div className="flex h-24 items-center" aria-hidden="true">
              <div className="h-8 w-2 shrink-0 rounded-sm bg-foreground/40" />
              {result.perSide.map((plate, i) => (
                <div
                  key={i}
                  className="ml-0.5 flex w-7 min-w-0 shrink items-center justify-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground"
                  style={{ height: `${HEIGHT[unit][plate] ?? 50}%` }}
                >
                  {plate}
                </div>
              ))}
              <div className="h-3 min-w-6 flex-1 rounded-r-full bg-foreground/25" />
            </div>
            <div>
              <p className="text-lg font-semibold">{result.perSide.join(' + ')} <span className="text-sm font-normal text-muted-foreground">on each side</span></p>
              <p className="text-sm text-muted-foreground">
                {result.loaded === total
                  ? `${num(total)} ${unit} with the ${bar} ${unit} bar`
                  : `That makes ${num(result.loaded)} ${unit}: the plates can’t make the last ${num(total - result.loaded)} ${unit}`}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
