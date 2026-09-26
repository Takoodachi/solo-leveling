// Regenerates the PWA / home-screen icons in public/icons from the "Ascent" mark
// (three stacked chevrons, the top one orange) on the app's near-black.
// Run: node scripts/generate-icons.mjs   (keep in step with src/components/Logo.tsx and public/favicon.svg)
import sharp from 'sharp'
import { mkdir } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public', 'icons')

await mkdir(outDir, { recursive: true })

const BACKGROUND = '#0a0a0b'
const ACCENT = '#ff5f1a'
const chevron = y => `M50,${y} L80,${y + 30} L67,${y + 30} L50,${y + 13} L33,${y + 30} L20,${y + 30} Z`

/** `radius` and `scale` are on the 100-unit artboard; the mark is centred. */
function svgIcon(size, radius, scale) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="${radius}" fill="${BACKGROUND}"/>
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
