import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { formatDisplayDate } from '@/lib/date'
import { homeWidgetDef } from '@/features/dashboard/homeWidgets'
import { isSupplement, tickCheckin, toggleCheckin } from './useCheckins'

/**
 * Mounted on Home. /home?log=creatine&day=YYYY-MM-DD (or log=magnesium), what a tap on that
 * reminder opens in the Android app (`tickLink` in reminders.ts; November 2026, at the owner's
 * request: the tap that opens the app does the ticking too), ticks that day, today without one,
 * and lands on the card. Tick only, like the reminder's own button, with an Undo in case the tap
 * was a slip.
 */
export function useSupplementLink(today: string): void {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const log = params.get('log')
  const kind = isSupplement(log) ? log : null
  const day = params.get('day')
  const used = useRef(false)
  useEffect(() => {
    if (!kind) {
      used.current = false
      return
    }
    if (used.current) return // an effect runs twice while developing
    used.current = true
    const date = day && /^\d{4}-\d{2}-\d{2}$/.test(day) && day <= today ? day : today
    // The link is used up at once, so Back or a reload can't tick again; the hash lands on the card
    navigate(`/home#${kind}`, { replace: true })
    const name = homeWidgetDef(kind)?.label ?? kind
    void tickCheckin(kind, date).then(ticked => {
      const when = date === today ? '' : ` for ${formatDisplayDate(date).replace('Yesterday', 'yesterday')}`
      if (ticked) toast.success(`${name} ticked off${when}`, { action: { label: 'Undo', onClick: () => void toggleCheckin(kind, date) } })
      else toast(`${name} was already ticked off${when}`)
    })
  }, [kind, day, today, navigate])
}
