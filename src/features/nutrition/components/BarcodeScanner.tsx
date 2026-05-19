import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { NotFoundException } from '@zxing/library'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface Props {
  onResult: (barcode: string) => void
  onCancel: () => void
}

export default function BarcodeScanner({ onResult, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!videoRef.current) return

    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader

    reader.decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
      if (result) {
        onResult(result.getText())
      }
      if (err && !(err instanceof NotFoundException)) {
        setError('Camera error — check permissions')
      }
    }).then(() => {
      setReady(true)
    }).catch(() => {
      setError('Could not access camera — check permissions')
    })

    return () => {
      BrowserMultiFormatReader.releaseAllStreams()
    }
  }, [onResult])

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-black">
        <video ref={videoRef} className="w-full h-full object-cover" />
        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 size={32} className="animate-spin text-white" />
          </div>
        )}
        {ready && (
          <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
            <div className="w-3/4 h-0.5 bg-primary/70 rounded" />
          </div>
        )}
      </div>

      {error ? (
        <p className="text-sm text-destructive text-center">{error}</p>
      ) : (
        <p className="text-xs text-muted-foreground text-center">
          Point camera at the product barcode
        </p>
      )}

      <Button variant="outline" onClick={onCancel}>Cancel</Button>
    </div>
  )
}
