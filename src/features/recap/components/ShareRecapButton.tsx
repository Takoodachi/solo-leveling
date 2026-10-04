import { useEffect, useState } from 'react'
import { Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { shareImage } from '@/lib/shareImage'
import { useAuthStore } from '@/features/auth/authStore'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { headline } from '../headline'
import type { Recap } from '../recap'
import { renderRecapCard } from '../shareCard'

interface Props {
  recap: Recap
  /** The period is still going ("so far" on the card). */
  current: boolean
}

type Card = { blob: Blob; url: string } | { error: string } | null

/** Made when the dialog opens, so the Share tap can open the share sheet straight away (iOS needs that). */
function useCard(recap: Recap, current: boolean): Card {
  const { settings } = useSettings()
  const email = useAuthStore(s => s.session?.user.email)
  const name = settings?.displayName?.trim() || email?.split('@')[0] || ''
  const avatar = settings?.avatar
  const [card, setCard] = useState<Card>(null)

  useEffect(() => {
    let url: string | null = null
    let cancelled = false
    renderRecapCard(recap, { name, avatar }, current)
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
  }, [recap, current, name, avatar])

  return card
}

function ShareDialog({ recap, current, onClose }: Props & { onClose: () => void }) {
  const card = useCard(recap, current)
  const [sharing, setSharing] = useState(false)
  // The line on the card, which is also the text sent with it: no food
  const line = headline(recap, { shared: true })

  async function share() {
    if (!card || !('blob' in card)) return
    setSharing(true)
    try {
      const outcome = await shareImage(card.blob, `solo-leveling-${recap.period}-${recap.dates[0]}.png`, `My ${recap.period}: ${line}`)
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
        <DialogTitle>Share your {recap.period}</DialogTitle>
        <DialogDescription>Training, steps, rank and new bests. Food and body weight stay private.</DialogDescription>
      </DialogHeader>
      <div className="aspect-[4/5] w-full overflow-hidden rounded-2xl bg-secondary">
        {card && 'url' in card && <img src={card.url} alt={`Recap card: ${line}`} className="h-full w-full object-cover" />}
        {card && 'error' in card && <p className="p-6 text-sm text-muted-foreground">{card.error}</p>}
      </div>
      <Button size="lg" className="gap-2" onClick={() => void share()} disabled={!card || !('blob' in card) || sharing}>
        <Share2 size={18} /> {card ? (sharing ? 'Opening…' : 'Share') : 'Making the image…'}
      </Button>
    </DialogContent>
  )
}

/** Recap page: the period as a picture for the group chat. */
export default function ShareRecapButton({ recap, current }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="secondary" size="lg" className="gap-2" onClick={() => setOpen(true)}>
        <Share2 size={18} /> Share as image
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        {/* Mounted only while open: the image is made fresh each time */}
        {open && <ShareDialog recap={recap} current={current} onClose={() => setOpen(false)} />}
      </Dialog>
    </>
  )
}
