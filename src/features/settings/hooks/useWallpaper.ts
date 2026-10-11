import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import { cleanLook, type WallpaperLook } from '../wallpaper'

export interface Wallpaper {
  /** The photo as a data URL; undefined when there's none. */
  image?: string
  look: WallpaperLook
}

/** The photo behind the app on this device and how it's shown; undefined while it loads. */
export function useWallpaper(): Wallpaper | undefined {
  return useLiveQuery(async () => {
    const [image, look] = await db.wallpaper.bulkGet(['image', 'look'])
    return {
      image: image?.key === 'image' ? image.dataUrl : undefined,
      look: cleanLook(look?.key === 'look' ? look : undefined),
    }
  }, [])
}
