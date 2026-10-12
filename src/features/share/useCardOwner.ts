import { useAuthStore } from '@/features/auth/authStore'
import { useSettings } from '@/features/settings/hooks/useSettings'
import type { CardOwner } from './card'

/** Whose card it is: the profile name (else the email's first part) and photo. */
export function useCardOwner(): CardOwner {
  const { settings } = useSettings()
  const email = useAuthStore(s => s.session?.user.email)
  return { name: settings?.displayName?.trim() || email?.split('@')[0] || '', avatar: settings?.avatar }
}
