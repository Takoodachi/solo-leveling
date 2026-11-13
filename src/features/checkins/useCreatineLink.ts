import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { formatDisplayDate } from '@/lib/date'
import { tickCheckin, toggleCheckin } from './useCheckins'

/**
 * Mounted on Home. /home?log=creatine&day=YYYY-MM-DD, what a tap on the creatine reminder opens in
 * the Android app (`creatineTickLink` in reminders.ts; November 2026, at the owner's request: the
 * tap that opens the app does the ticking too), ticks that day, today without one, and lands on
 * the card. Tick only, like the reminder's own button, with an Undo in case the tap was a slip.
 */
export function useCreatineLink(today: string): void {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const due = params.get('log') === 'creatine'
  const day = params.get('day')
  const used = useRef(false)
  useEffect(() => {
    if (!due) {
      used.current = false
      return
    }
    if (used.current) return // an effect runs twice while developing
    used.current = true
    const date = day && /^\d{4}-\d{2}-\d{2}$/.test(day) && day <= today ? day : today
    // The link is used up at once, so Back or a reload can't tick again; the hash lands on the card
    navigate('/home#creatine', { replace: true })
    void tickCheckin('creatine', date).then(ticked => {
      const when = date === today ? '' : ` for ${formatDisplayDate(date).replace('Yesterday', 'yesterday')}`
      if (ticked) toast.success(`Creatine ticked off${when}`, { action: { label: 'Undo', onClick: () => void toggleCheckin('creatine', date) } })
      else toast(`Creatine was already ticked off${when}`)
    })
  }, [due, day, today, navigate])
}
