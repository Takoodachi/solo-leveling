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
