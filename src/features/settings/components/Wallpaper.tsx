import { useEffect } from 'react'
import { useWallpaper } from '../hooks/useWallpaper'
import { useSettings } from '../hooks/useSettings'
import { cardStyleOf } from '../cardStyle'

/**
 * What's behind the whole app (mounted once, in App): the user's photo, or, when the cards are
 * glass and there's no photo, a soft glow in the theme's colours, because glass over a flat
 * colour is just a grey card. It sits under everything on a layer of its own, so scrolling
 * never repaints it. While it's up, <html> carries `data-wallpaper` ("photo" or "glow"; and
 * `data-scrolled` once the page has moved): index.css then lets page fills through, makes cards
 * slightly see-through and keeps bars off it where nothing needs them.
 */
export default function Wallpaper() {
  const wallpaper = useWallpaper()
  const image = wallpaper?.image
  const { settings } = useSettings()
  const kind = image ? 'photo' : wallpaper && cardStyleOf(settings?.cardStyle) === 'glass' ? 'glow' : null

  useEffect(() => {
    if (!kind) return
    const root = document.documentElement
    root.dataset.wallpaper = kind
    // Whether anything has scrolled up under the status bar (its scrim only shows then)
    const onScroll = () => root.toggleAttribute('data-scrolled', window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      delete root.dataset.wallpaper
      delete root.dataset.scrolled
    }
  }, [kind])

  // The large viewport height: it mustn't resize (and re-crop the photo) as a browser's toolbar slides away
  const layer = 'pointer-events-none fixed left-0 top-0 -z-10 h-screen h-[100lvh] w-full'
  if (!image) return kind ? <div aria-hidden="true" className={`ambient-glow ${layer}`} /> : null
  const { dim, blur } = wallpaper.look
  return (
    <div aria-hidden="true" className={`${layer} overflow-hidden`}>
      <img
        src={image}
        alt=""
        decoding="async"
        className="h-full w-full object-cover"
        // Scaled up a touch so the blur's soft edge stays off screen
        style={blur > 0 ? { filter: `blur(${blur}px)`, transform: 'scale(1.08)' } : undefined}
      />
      <div className="absolute inset-0 bg-background" style={{ opacity: dim }} />
    </div>
  )
}
