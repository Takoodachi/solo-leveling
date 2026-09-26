import { useRef, useState, type ChangeEvent } from 'react'
import { Camera } from 'lucide-react'
import { toast } from 'sonner'
import Avatar from '@/components/Avatar'
import { avatarFromFile } from '../avatar'
import { updateSettings } from '../hooks/useSettings'

interface Props {
  name: string
  src?: string
  size?: number
}

/** Tap the avatar to pick a photo; it's cropped square and shrunk before saving. */
export default function AvatarPicker({ name, src, size = 72 }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // picking the same file again still fires
    if (!file) return
    setBusy(true)
    try {
      await updateSettings({ avatar: await avatarFromFile(file) })
      toast.success('Photo updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Couldn’t use that image')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative shrink-0">
      <button type="button" onClick={() => input.current?.click()} disabled={busy} aria-label={src ? 'Change photo' : 'Add a photo'} className="block rounded-full">
        <Avatar name={name} src={src} size={size} className={busy ? 'opacity-60' : undefined} />
        <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-foreground text-background">
          <Camera size={14} />
        </span>
      </button>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={e => void onFile(e)} />
    </div>
  )
}
