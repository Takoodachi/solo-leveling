import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { requestSync } from '@/lib/sync'
import { useAuthStore } from '@/features/auth/authStore'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { isSharing, showsRoutines } from './api'

/** Copy where the Clipboard API is missing or refused (the Android app's WebView can be either). */
function copyText(text: string): boolean {
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.cssText = 'position:fixed;opacity:0'
  document.body.append(area)
  area.select()
  const ok = document.execCommand('copy')
  area.remove()
  return ok
}

/**
 * A link to your profile that opens your routines (one of them with `routineId`, else your week),
 * through the share sheet where there is one, else copied. It works for friends signed in to the app.
 */
export function useShareRoutineLink() {
  const navigate = useNavigate()
  const userId = useAuthStore(s => s.userId)
  const { settings } = useSettings()

  return async function share({ routineId, title }: { routineId?: string; title: string }) {
    const fix = { action: { label: 'Settings', onClick: () => navigate('/settings#sharing') } }
    if (!userId) return void toast.error('Sign in to share', { description: 'The link opens your profile, which needs an account.' })
    if (!isSharing(settings)) return void toast.error('You’re off the leaderboard', { description: 'Friends can’t open your profile until sharing is on.', ...fix })
    if (!showsRoutines(settings)) return void toast.error('Your routines are hidden', { description: 'Turn on “Show my routines” so the link has something to open.', ...fix })

    requestSync() // so the profile carries what's being shared before the friend opens it
    const url = `${location.origin}/leaderboard/${userId}?${routineId ? `routine=${encodeURIComponent(routineId)}` : 'plan=1'}`
    const text = routineId ? `My “${title}” routine on Solo Leveling` : 'My weekly plan on Solo Leveling'
    if (navigator.share) {
      try {
        return void (await navigator.share({ title, text, url }))
      } catch (e) {
        if ((e as Error).name === 'AbortError') return // closed the share sheet
      }
    }
    let copied: boolean
    try {
      await navigator.clipboard.writeText(url)
      copied = true
    } catch {
      copied = copyText(url)
    }
    if (copied) toast.success('Link copied', { description: 'Send it to a friend: it opens your profile with this on show.' })
    else toast.error('Couldn’t copy the link', { description: url })
  }
}
