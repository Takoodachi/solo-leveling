import { useEffect, useState, type CSSProperties } from 'react'
import { withImage } from '@/lib/image'

export type Tone = 'light' | 'dark'
/** Where the text sits over the photo: a card's left side and bottom, or the routine page's top bar. */
export type Region = 'left' | 'top'

const SIZE = 48
const tones = new Map<string, Tone>()

/** sRGB 0–255 → linear light, for luminance. */
const linear = (c: number) => {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

/**
 * Whether a photo is light or dark where the text goes. The average colour of that part decides,
 * by which of near-black or white text would stand out more against it (their contrast is equal
 * at a luminance of about 0.19, a mid grey).
 */
export async function photoTone(image: string, region: Region): Promise<Tone> {
  const key = `${region}:${image.length}:${image.slice(-64)}`
  const known = tones.get(key)
  if (known) return known
  const blob = await (await fetch(image)).blob()
  const lum = await withImage(blob, img => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = SIZE
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return 0.5
    ctx.drawImage(img, 0, 0, SIZE, SIZE)
    const [x, y, w, h] = region === 'left' ? [0, SIZE * 0.25, SIZE * 0.6, SIZE * 0.75] : [0, 0, SIZE, SIZE * 0.3]
    const px = ctx.getImageData(x, y, w, h).data
    let sum = 0
    for (let i = 0; i < px.length; i += 4) sum += 0.2126 * linear(px[i]) + 0.7152 * linear(px[i + 1]) + 0.0722 * linear(px[i + 2])
    return sum / (px.length / 4)
  })
  const tone: Tone = lum > 0.19 ? 'light' : 'dark'
  tones.set(key, tone)
  return tone
}

/** The photo's tone where the text sits, once worked out (undefined until then, or without a photo). */
export function usePhotoTone(image: string | undefined, region: Region): Tone | undefined {
  const [found, setFound] = useState<{ image: string; tone: Tone } | null>(null)
  useEffect(() => {
    if (!image?.startsWith('data:image/')) return
    let live = true
    void photoTone(image, region).then(tone => live && setFound({ image, tone })).catch(() => {})
    return () => {
      live = false
    }
  }, [image, region])
  return image && found?.image === image ? found.tone : undefined
}

/**
 * The colours for text over a photo of that tone, whatever the theme: dark text on a light veil
 * over a light photo, white on a dark one over a dark photo. They're the theme's own variables,
 * set on the element, so everything inside (text, the fade, a button) follows.
 */
export function toneStyle(tone: Tone | undefined): CSSProperties | undefined {
  if (!tone) return undefined
  const vars = tone === 'light'
    ? { '--foreground': '240 10% 8%', '--muted-foreground': '240 6% 30%', '--card': '0 0% 100%', '--background': '0 0% 100%' }
    : { '--foreground': '0 0% 98%', '--muted-foreground': '0 0% 80%', '--card': '240 6% 10%', '--background': '240 6% 6%' }
  return vars as CSSProperties
}
