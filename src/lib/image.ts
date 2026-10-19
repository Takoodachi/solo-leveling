const MAX_INPUT_BYTES = 25 * 1024 * 1024

/** Shrink a picked photo to a JPEG data URL no longer than `maxSide` on its long side. Throws a readable message on bad input. */
export async function shrinkPhoto(file: File, maxSide: number, quality: number): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('That file isn’t an image')
  if (file.size > MAX_INPUT_BYTES) throw new Error('That image is too large (25 MB max)')
  try {
    return await withImage(file, (image, width, height) => {
      const scale = Math.min(1, maxSide / Math.max(width, height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(width * scale))
      canvas.height = Math.max(1, Math.round(height * scale))
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('no canvas')
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      return canvas.toDataURL('image/jpeg', quality)
    })
  } catch {
    throw new Error('Couldn’t read that image. Try a JPEG or PNG.')
  }
}

/**
 * Decode an image the user picked and hand it over with its real size, the photo's own
 * rotation already applied. `draw` uses it; nothing of the decoded image outlives the call.
 */
export async function withImage<T>(file: Blob, draw: (image: CanvasImageSource, width: number, height: number) => T): Promise<T> {
  let bitmap: ImageBitmap | undefined
  if ('createImageBitmap' in window) {
    try {
      bitmap = await createImageBitmap(file) // applies the photo's EXIF rotation
    } catch {
      // older Safari can't decode some files this way: fall back to an <img>
    }
  }
  if (bitmap) {
    try {
      return draw(bitmap, bitmap.width, bitmap.height)
    } finally {
      bitmap.close()
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return draw(img, img.naturalWidth, img.naturalHeight)
  } finally {
    URL.revokeObjectURL(url)
  }
}
