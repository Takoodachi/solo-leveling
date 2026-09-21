import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType, NotFoundException } from '@zxing/library'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { normalizeBarcode } from '../openFoodFacts'

interface Props {
  /** Called once with a validated barcode (UPC-E already expanded). */
  onResult: (barcode: string) => void
  onCancel: () => void
}

// Only retail product barcodes. Allowing every format (QR, Code 39, ITF…) lets
// random patterns on packaging decode as bogus "barcodes".
const hints = new Map<DecodeHintType, unknown>([
  [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]],
  [DecodeHintType.TRY_HARDER, true],
])

// A single frame can misread; accept a code only after this many identical reads in a row.
const CONFIRMATIONS = 2

export default function BarcodeScanner({ onResult, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onResultRef = useRef(onResult)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [manual, setManual] = useState('')
  const [manualError, setManualError] = useState<string | null>(null)

  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const reader = new BrowserMultiFormatReader(hints)
    let controls: IScannerControls | null = null
    let stopped = false
    let last = ''
    let streak = 0

    reader
      .decodeFromConstraints(
        { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } },
        video,
        (result, err) => {
          if (stopped) return
          if (result) {
            const code = normalizeBarcode(result.getText(), result.getBarcodeFormat() === BarcodeFormat.UPC_E)
            if (!code) return // failed the check digit: keep scanning
            streak = code === last ? streak + 1 : 1
            last = code
            if (streak >= CONFIRMATIONS) {
              stopped = true
              controls?.stop()
              navigator.vibrate?.(60)
              onResultRef.current(code)
            }
          } else if (err && !(err instanceof NotFoundException)) {
            setError('Camera error — check permissions')
          }
        },
      )
      .then(c => {
        controls = c
        if (stopped) c.stop()
        else setReady(true)
      })
      .catch(() => setError('Could not access the camera — check permissions, or type the number below.'))

    return () => {
      stopped = true
      controls?.stop()
    }
  }, [])

  function submitManual(e: React.FormEvent) {
    e.preventDefault()
    const code = normalizeBarcode(manual)
    if (!code) {
      setManualError('That isn’t a valid barcode — check the digits under the bars.')
      return
    }
    onResultRef.current(code)
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 size={32} className="animate-spin text-white" />
          </div>
        )}
        {ready && (
          <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-xl border-2 border-white/70">
            <div className="absolute inset-x-2 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-primary" />
          </div>
        )}
      </div>

      <p className={error ? 'text-center text-sm text-destructive' : 'text-center text-xs text-muted-foreground'}>
        {error ?? 'Hold the barcode inside the frame, about a hand’s length away.'}
      </p>

      <form onSubmit={submitManual} className="flex gap-2">
        <Input
          inputMode="numeric"
          placeholder="Or type the number"
          value={manual}
          onChange={e => { setManual(e.target.value.replace(/[^\d ]/g, '')); setManualError(null) }}
          aria-label="Barcode number"
        />
        <Button type="submit" variant="secondary" disabled={manual.replace(/\D/g, '').length < 8}>Look up</Button>
      </form>
      {manualError && <p className="text-xs text-destructive">{manualError}</p>}

      <Button variant="ghost" onClick={onCancel}>Cancel</Button>
    </div>
  )
}
