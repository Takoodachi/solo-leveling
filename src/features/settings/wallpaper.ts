import { db } from '@/db'
import { shrinkPhoto } from '@/lib/image'
import { clamp } from '@/lib/utils'

/**
 * A photo of the user's own behind the app (Settings → Theme). It stays on this device: a few
 * hundred KB is too much to carry in the synced settings row, and a phone and a laptop want
 * different crops anyway. The table never syncs, isn't in the backup, and is wiped with
 * everything else on sign-out.
 *
 * The photo is shrunk once, when it's picked. How it's shown is two numbers, kept on a row of
 * their own so dragging a slider doesn't rewrite the picture: `dim` is how much of the theme's
 * background colour lies over it (what keeps text readable), `blur` softens it.
 */

/** Enough for a phone held upright at 3×; bigger only costs memory. */
const MAX_SIDE = 1600
const QUALITY = 0.8

export interface WallpaperLook {
  /** 0–1: the share of the theme's background colour over the photo. */
  dim: number
  /** Pixels of blur. */
  blur: number
}

export const DEFAULT_LOOK: WallpaperLook = { dim: 0.7, blur: 0 }
/** Below the low end of `dim`, text straight on the page stops being readable over a bright photo. */
export const LOOK_RANGE = { dim: [0.4, 0.92], blur: [0, 24] } as const


export function cleanLook(look: Partial<WallpaperLook> | undefined): WallpaperLook {
  return {
    dim: clamp(look?.dim ?? DEFAULT_LOOK.dim, LOOK_RANGE.dim),
    blur: clamp(look?.blur ?? DEFAULT_LOOK.blur, LOOK_RANGE.blur),
  }
}

/** Shrink a picked image to a JPEG data URL sized for a screen. Throws a readable message on bad input. */
export const wallpaperFromFile = (file: File) => shrinkPhoto(file, MAX_SIDE, QUALITY)

/** Put a new photo behind the app, keeping how the last one was shown. */
export async function saveWallpaper(dataUrl: string): Promise<void> {
  await db.wallpaper.put({ key: 'image', dataUrl, updatedAt: Date.now() })
}

export async function saveWallpaperLook(look: WallpaperLook): Promise<void> {
  await db.wallpaper.put({ key: 'look', ...cleanLook(look), updatedAt: Date.now() })
}

/** Back to the plain theme. The look is kept for the next photo. */
export async function removeWallpaper(): Promise<void> {
  await db.wallpaper.delete('image')
}
