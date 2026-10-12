import { useCallback, useState } from 'react'
import { Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ShareImageDialog from '@/features/share/ShareImageDialog'
import { useCardOwner } from '@/features/share/useCardOwner'
import { headline } from '../headline'
import type { Recap } from '../recap'
import { renderRecapCard } from '../shareCard'

interface Props {
  recap: Recap
  /** The period is still going ("so far" on the card). */
  current: boolean
}

/** Recap page: the period as a picture for the group chat. */
export default function ShareRecapButton({ recap, current }: Props) {
  const [open, setOpen] = useState(false)
  const { name, avatar } = useCardOwner()
  const make = useCallback(() => renderRecapCard(recap, { name, avatar }, current), [recap, name, avatar, current])
  // The line on the card, which is also the text sent with it: no food
  const line = headline(recap, { shared: true })
  return (
    <>
      <Button variant="secondary" size="lg" className="gap-2" onClick={() => setOpen(true)}>
        <Share2 size={18} /> Share as image
      </Button>
      <ShareImageDialog
        open={open}
        onOpenChange={setOpen}
        title={`Share your ${recap.period}`}
        description="Training, steps, rank and new bests. Food and body weight stay private."
        make={make}
        fileName={`solo-leveling-${recap.period}-${recap.dates[0]}.png`}
        text={`My ${recap.period}: ${line}`}
        alt={`Recap card: ${line}`}
      />
    </>
  )
}
