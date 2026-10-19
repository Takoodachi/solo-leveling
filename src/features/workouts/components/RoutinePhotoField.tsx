import { useRef } from 'react'
import { ImagePlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { shrinkPhoto } from '@/lib/image'
import type { RoutineCategory } from '@/types'
import RoutineArt from './RoutineArt'

// Sharp across a phone-wide card and the routine page's hero, and about 100 KB, since it syncs
const PHOTO_SIDE = 960
const PHOTO_QUALITY = 0.72

interface Props {
  category: RoutineCategory
  image: string | undefined
  onChange: (image: string | undefined) => void
}

/** The routine editor's photo: a preview as the cards will show it, Add / Change and Remove. */
export default function RoutinePhotoField({ category, image, onChange }: Props) {
  const input = useRef<HTMLInputElement>(null)

  async function pick(file: File | undefined) {
    if (!file) return
    try {
      onChange(await shrinkPhoto(file, PHOTO_SIDE, PHOTO_QUALITY))
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>Photo</Label>
      <div className="flex items-center gap-3">
        <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-2xl bg-card">
          <RoutineArt category={category} image={image} />
        </div>
        <Button type="button" variant="secondary" className="gap-2" onClick={() => input.current?.click()}>
          <ImagePlus size={16} /> {image ? 'Change' : 'Add photo'}
        </Button>
        {image && <Button type="button" variant="ghost" onClick={() => onChange(undefined)}>Remove</Button>}
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          onChange={e => {
            void pick(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">Shown behind the routine on Home, Workouts and its own page.</p>
    </div>
  )
}
