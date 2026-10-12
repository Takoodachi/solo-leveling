import { useEffect, useState } from 'react'
import { Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { shareImage } from '@/lib/shareImage'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** What's on the card, and what stays off it. */
  description: string
  /** Draws the card. Keep it stable (useCallback): a new one draws the card again. */
  make: () => Promise<Blob>
  fileName: string
  /** Sent with the image where the share target takes text. */
  text: string
  alt: string
}

type Card = { blob: Blob; url: string } | { error: string } | null

/** Made when the dialog opens, so the Share tap can open the share sheet straight away (iOS needs that). */
function useCard(make: () => Promise<Blob>): Card {
  const [card, setCard] = useState<Card>(null)
  useEffect(() => {
    let url: string | null = null
    let cancelled = false
    make()
      .then(blob => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setCard({ blob, url })
      })
      .catch((err: unknown) => { if (!cancelled) setCard({ error: err instanceof Error ? err.message : String(err) }) })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [make])
  return card
}

function Content({ title, description, make, fileName, text, alt, onClose }: Omit<Props, 'open' | 'onOpenChange'> & { onClose: () => void }) {
  const card = useCard(make)
  const [sharing, setSharing] = useState(false)

  async function share() {
    if (!card || !('blob' in card)) return
    setSharing(true)
    try {
      const outcome = await shareImage(card.blob, fileName, text)
      if (outcome === 'saved') toast.success('Image saved', { description: 'It’s in your downloads, ready to send.' })
      if (outcome === 'needs-update') toast('Update the app to share images', { description: 'Install the latest Android build, or share from the site in Chrome.' })
      if (outcome === 'shared' || outcome === 'saved') onClose()
    } catch (err) {
      toast.error('Couldn’t share the image', { description: err instanceof Error ? err.message : String(err) })
    } finally {
      setSharing(false)
    }
  }

  return (
    <DialogContent className="max-w-sm">
      <DialogHeader className="text-left">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <div className="aspect-[4/5] w-full shrink-0 overflow-hidden rounded-2xl bg-secondary">
        {card && 'url' in card && <img src={card.url} alt={alt} className="h-full w-full object-cover" />}
        {card && 'error' in card && <p className="p-6 text-sm text-muted-foreground">{card.error}</p>}
      </div>
      <Button size="lg" className="shrink-0 gap-2" onClick={() => void share()} disabled={!card || !('blob' in card) || sharing}>
        <Share2 size={18} /> {card ? (sharing ? 'Opening…' : 'Share') : 'Making the image…'}
      </Button>
    </DialogContent>
  )
}

/** A share card's preview and its Share button (the recap's, a workout's). */
export default function ShareImageDialog({ open, onOpenChange, ...rest }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Mounted only while open: the image is made fresh each time */}
      {open && <Content {...rest} onClose={() => onOpenChange(false)} />}
    </Dialog>
  )
}
