/**
 * Profile photos: cropped to a centred square and shrunk to a small JPEG data URL
 * (≈10 KB), stored in settings and shared inside the leaderboard snapshot. No
 * storage bucket needed, so it stays on the free tier and works offline.
 */

import { withImage } from '@/lib/image'

const SIZE = 160 // px: sharp at the largest avatar (72 px) on 2× screens
const QUALITY = 0.82
const MAX_INPUT_BYTES = 25 * 1024 * 1024
/** Friends' photos are data we didn't make: only small raster data URLs are drawn. */
const AVATAR_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/
const MAX_URL_LENGTH = 100_000

export function safeAvatar(src: string | undefined | null): string | undefined {
  return src && src.length <= MAX_URL_LENGTH && AVATAR_URL.test(src) ? src : undefined
}

/** The letters for an avatar without a photo: "Tako" is TA, "Luong Tran" and "luong.tran" are LT. */
export function initials(name: string): string {
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function draw(file: File, ctx: CanvasRenderingContext2D): Promise<void> {
  return withImage(file, (image, w, h) => {
    const side = Math.min(w, h)
    ctx.drawImage(image, (w - side) / 2, (h - side) / 2, side, side, 0, 0, SIZE, SIZE)
  })
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
