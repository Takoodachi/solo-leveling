/**
 * Profile photos: cropped to a centred square and shrunk to a small JPEG data URL
 * (≈10 KB), stored in settings and shared inside the leaderboard snapshot. No
 * storage bucket needed, so it stays on the free tier and works offline.
 */

const SIZE = 160 // px: sharp at the largest avatar (72 px) on 2× screens
const QUALITY = 0.82
const MAX_INPUT_BYTES = 25 * 1024 * 1024
/** Friends' photos are data we didn't make: only small raster data URLs are drawn. */
const AVATAR_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/
const MAX_URL_LENGTH = 100_000

export function safeAvatar(src: string | undefined | null): string | undefined {
  return src && src.length <= MAX_URL_LENGTH && AVATAR_URL.test(src) ? src : undefined
}

async function draw(file: File, ctx: CanvasRenderingContext2D): Promise<void> {
  const crop = (w: number, h: number) => {
    const side = Math.min(w, h)
    return [(w - side) / 2, (h - side) / 2, side, side, 0, 0, SIZE, SIZE] as const
  }
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file) // applies the photo's EXIF rotation
      ctx.drawImage(bitmap, ...crop(bitmap.width, bitmap.height))
      bitmap.close()
      return
    } catch {
      // older Safari can't decode some files this way: fall back to an <img>
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    ctx.drawImage(img, ...crop(img.naturalWidth, img.naturalHeight))
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Turn a picked image into the avatar data URL. Throws a readable message on bad input. */
export async function avatarFromFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('That file isn’t an image')
  if (file.size > MAX_INPUT_BYTES) throw new Error('That image is too large (25 MB max)')
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Couldn’t process the image')
  ctx.imageSmoothingQuality = 'high'
  try {
    await draw(file, ctx)
  } catch {
    throw new Error('Couldn’t read that image. Try a JPEG or PNG.')
  }
  return canvas.toDataURL('image/jpeg', QUALITY)
}
