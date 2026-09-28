// Regenerates the PWA / home-screen icons in public/icons, and the Android app's launcher
// icons (when android/ exists), from the "Ascent" mark (three stacked chevrons, the top one
// orange) on the app's near-black.
// Run: node scripts/generate-icons.mjs   (keep in step with src/components/Logo.tsx and public/favicon.svg)
import sharp from 'sharp'
import { access, mkdir } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public', 'icons')

await mkdir(outDir, { recursive: true })

const BACKGROUND = '#0a0a0b'
const ACCENT = '#ff5f1a'
const chevron = y => `M50,${y} L80,${y + 30} L67,${y + 30} L50,${y + 13} L33,${y + 30} L20,${y + 30} Z`

/**
 * `radius` and `scale` are on the 100-unit artboard; the mark is centred. `radius` 50 gives a
 * circle; `background: false` leaves it transparent (an Android adaptive-icon foreground).
 */
function svgIcon(size, radius, scale, background = true) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  ${background ? `<rect width="100" height="100" rx="${radius}" fill="${BACKGROUND}"/>` : ''}
  <g transform="translate(50 50) scale(${scale}) translate(-50 -48)">
    <path d="${chevron(12)}" fill="${ACCENT}"/>
    <path d="${chevron(33)} ${chevron(54)}" fill="#ffffff"/>
  </g>
</svg>`
}

const configs = [
  { name: 'icon-192.png', size: 192, radius: 16.7, scale: 0.72 },
  { name: 'icon-512.png', size: 512, radius: 15.6, scale: 0.72 },
  // Maskable: launchers crop to a circle or squircle, so keep the mark inside the central 80%
  { name: 'icon-maskable-512.png', size: 512, radius: 0, scale: 0.6 },
  // iOS home screen: opaque, square (iOS applies its own rounded mask)
  { name: 'apple-touch-icon.png', size: 180, radius: 0, scale: 0.66 },
]

for (const { name, size, radius, scale } of configs) {
  await sharp(Buffer.from(svgIcon(size, radius, scale))).png().toFile(join(outDir, name))
  console.log(`Generated ${name}`)
}

console.log('Icons generated in public/icons/')

// Android launcher icons. The adaptive icon (Android 8+, which is all the app supports) is this
// transparent foreground on @color/ic_launcher_background; launchers show its central 66 of 108 dp.
const androidRes = join(__dirname, '..', 'android', 'app', 'src', 'main', 'res')
const hasAndroid = await access(androidRes).then(() => true, () => false)
if (hasAndroid) {
  const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }
  for (const [density, k] of Object.entries(densities)) {
    const dir = join(androidRes, `mipmap-${density}`)
    await mkdir(dir, { recursive: true })
    const icons = [
      { name: 'ic_launcher_foreground.png', size: 108 * k, radius: 0, scale: 0.56, background: false },
      { name: 'ic_launcher.png', size: 48 * k, radius: 16.7, scale: 0.72 },
      { name: 'ic_launcher_round.png', size: 48 * k, radius: 50, scale: 0.62 },
    ]
    for (const { name, size, radius, scale, background } of icons) {
      await sharp(Buffer.from(svgIcon(size, radius, scale, background))).png().toFile(join(dir, name))
    }
    // Launch screen icon: drawn in a 288 dp box (the central 192 dp circle shows), so render it
    // at that size rather than stretching the 108 dp foreground. Same proportions as the launcher.
    const drawables = join(androidRes, `drawable-${density}`)
    await mkdir(drawables, { recursive: true })
    await sharp(Buffer.from(svgIcon(288 * k, 0, 0.56, false))).png().toFile(join(drawables, 'splash_icon.png'))
  }
  console.log('Android launcher and launch-screen icons generated in android/app/src/main/res/')
}
