import { useLocation, useNavigate } from 'react-router-dom'
import { morphBack } from '@/lib/morph'

/**
 * Go back in history, or to `fallback` when this screen was the entry point
 * (deep link / cold start of the installed app), so "Back" never leaves the app.
 */
export function useGoBack(fallback = '/home'): () => void {
  const navigate = useNavigate()
  const location = useLocation()
  return () => {
    if (location.key === 'default') navigate(fallback, { replace: true })
    else if (!morphBack(location.key, () => navigate(-1))) navigate(-1)
  }
}
