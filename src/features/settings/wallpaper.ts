import { db } from '@/db'
import { shrinkPhoto } from '@/lib/image'
import { deleteSynced, requestSync } from '@/lib/sync'
import { clamp, screenKind } from '@/lib/utils'

/**
 * A photo of the user's own behind the app (Settings → Theme). It syncs with the account, so a
 * reinstall brings it back (November 2026; it used to stay on the device). It has a table of its
 * own rather than a place in the settings row, so a few hundred KB only travel when the photo
 * changes, and phones and computers each keep their own (`screenKind`): a photo picked for a
 * phone held upright is cropped wrong on a laptop. It isn't in the backup, and is wiped with
 * everything else on sign-out (the next sign-in brings it back).
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

/** This kind of screen's two rows. */
export function wallpaperIds() {
  const kind = screenKind()
  return { image: `image-${kind}`, look: `look-${kind}` }
}

export function cleanLook(look: { dim?: number | null; blur?: number | null } | undefined): WallpaperLook {
  return {
    dim: clamp(look?.dim ?? DEFAULT_LOOK.dim, LOOK_RANGE.dim),
    blur: clamp(look?.blur ?? DEFAULT_LOOK.blur, LOOK_RANGE.blur),
  }
}

/** Shrink a picked image to a JPEG data URL sized for a screen. Throws a readable message on bad input. */
export const wallpaperFromFile = (file: File) => shrinkPhoto(file, MAX_SIDE, QUALITY)

/** Put a new photo behind the app, keeping how the last one was shown. */
export async function saveWallpaper(dataUrl: string): Promise<void> {
  const { image } = wallpaperIds()
  await db.wallpapers.put({ uuid: image, dataUrl, updatedAt: Date.now(), syncPending: true })
  // Its id is fixed: if the photo was removed a moment ago, that delete is off
  await db.pendingDeletes.delete(`wallpapers:${image}`)
  requestSync()
}

let lookSync: ReturnType<typeof setTimeout> | undefined

export async function saveWallpaperLook(look: WallpaperLook): Promise<void> {
  await db.wallpapers.put({ uuid: wallpaperIds().look, ...cleanLook(look), updatedAt: Date.now(), syncPending: true })
  // A slider saves on every step: send the look once it has stopped moving
  clearTimeout(lookSync)
  lookSync = setTimeout(requestSync, 1500)
}

/** Back to the plain theme. The look is kept for the next photo. */
export async function removeWallpaper(): Promise<void> {
  await deleteSynced(db.wallpapers, 'wallpapers', [wallpaperIds().image])
}
