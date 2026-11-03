import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { cleanLook, wallpaperIds, type WallpaperLook } from '../wallpaper'

export interface Wallpaper {
  /** The photo as a data URL; undefined when there's none. */
  image?: string
  look: WallpaperLook
}

/** The photo behind the app on this kind of screen and how it's shown; undefined while it loads. */
export function useWallpaper(): Wallpaper | undefined {
  return useLiveQuery(async () => {
    const ids = wallpaperIds()
    const [image, look] = await db.wallpapers.bulkGet([ids.image, ids.look])
    return { image: image?.dataUrl ?? undefined, look: cleanLook(look) }
  }, [])
}
