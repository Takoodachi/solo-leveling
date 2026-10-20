import { useLocation, useNavigationType } from 'react-router-dom'

/**
 * The class a screen comes in with: from the right when it's opened, from the left when Back
 * returns to it, a plain fade for the app's first screen. It moves `left` (on a `relative`
 * element), not a transform, because a transform would unpin the fixed bars inside for as long
 * as it runs.
 */
export function useEnterAnimation(): string {
  const type = useNavigationType()
  const { key } = useLocation()
  if (key === 'default') return 'animate-fade-in'
  return type === 'POP' ? 'animate-pop-in' : type === 'PUSH' ? 'animate-push-in' : 'animate-fade-in'
}

/** Back (or Forward) arrived here, as opposed to a link or the app's first screen. */
export function useCameBack(): boolean {
  const type = useNavigationType()
  const { key } = useLocation()
  return type === 'POP' && key !== 'default'
}
