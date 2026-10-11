import { useEffect } from 'react'
import { useWallpaper } from '../hooks/useWallpaper'

/**
 * The user's photo behind the whole app (mounted once, in App). It sits under everything on a
 * layer of its own, so scrolling never repaints it. While it's up, <html> carries
 * `data-wallpaper` (and `data-scrolled` once the page has moved): index.css then lets page fills
 * through, makes cards slightly see-through and keeps bars off the photo where nothing needs them.
 */
export default function Wallpaper() {
  const wallpaper = useWallpaper()
  const image = wallpaper?.image

  useEffect(() => {
    if (!image) return
    const root = document.documentElement
    root.dataset.wallpaper = ''
    // Whether anything has scrolled up under the status bar (its scrim only shows then)
    const onScroll = () => root.toggleAttribute('data-scrolled', window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      delete root.dataset.wallpaper
      delete root.dataset.scrolled
    }
  }, [image])

  if (!image) return null
  const { dim, blur } = wallpaper.look
  return (
    // The large viewport height: it mustn't resize (and re-crop the photo) as a browser's toolbar slides away
    <div aria-hidden="true" className="pointer-events-none fixed left-0 top-0 -z-10 h-screen h-[100lvh] w-full overflow-hidden">
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
