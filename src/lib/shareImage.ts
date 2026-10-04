import { isAndroidApp, isUnimplemented, soloPlugin } from './native'

export type ShareOutcome = 'shared' | 'saved' | 'cancelled' | 'needs-update'

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ''))
    reader.onerror = () => reject(reader.error ?? new Error('Couldn’t read the image'))
    reader.readAsDataURL(blob)
  })
}

/**
 * Hands a PNG to the phone's share sheet (WhatsApp, Messenger, Save image…). The Android
 * app's WebView has no Web Share API and drops downloads, so it goes through the app's own
 * plugin; browsers and the iOS home-screen app use the Web Share API; desktops download it.
 * Call from a tap with the image already made: iOS only opens the share sheet straight from one.
 */
export async function shareImage(blob: Blob, fileName: string, text: string): Promise<ShareOutcome> {
  if (isAndroidApp()) {
    const plugin = await soloPlugin()
    if (!plugin) return 'needs-update'
    try {
      await plugin.shareImage({ base64: await toBase64(blob), fileName, text })
      return 'shared'
    } catch (err) {
      if (isUnimplemented(err)) return 'needs-update'
      throw err
    }
  }
  const file = new File([blob], fileName, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text })
      return 'shared'
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
      throw err
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'saved'
}
