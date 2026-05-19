import sharp from 'sharp'
import { mkdir } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public', 'icons')

await mkdir(outDir, { recursive: true })

function hexPoints(cx, cy, r) {
  // Flat-top hexagon: 6 points starting from the top-right
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30)
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
  }).join(' ')
}

function svgIcon(size, borderRadius = 0) {
  const cx = size / 2
  const cy = size / 2

  const hexR = size * 0.43
  const hex = hexPoints(cx, cy, hexR)

  // Dumbbell geometry
  const barH = size * 0.09
  const barW = size * 0.36
  const plateW = size * 0.095
  const plateH = size * 0.27
  const barX = cx - barW / 2
  const barY = cy - barH / 2
  const lPlateX = barX - plateW
  const rPlateX = barX + barW
  const plateY = cy - plateH / 2
  const plateRx = size * 0.018

  // Gold arrow: centered bottom-right of the dumbbell
  const arrowX = cx + size * 0.26
  const arrowY = cy + size * 0.26
  const arrowSize = size * 0.13

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="hg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#5b21b6"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="${size * 0.025}" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${borderRadius}" fill="#0a0a0a"/>

  <!-- Hexagon -->
  <polygon points="${hex}" fill="url(#hg)" filter="url(#glow)"/>

  <!-- Dumbbell bar -->
  <rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="${barH / 2}" fill="#ffffff"/>

  <!-- Left plate -->
  <rect x="${lPlateX}" y="${plateY}" width="${plateW}" height="${plateH}" rx="${plateRx}" fill="#ffffff"/>

  <!-- Right plate -->
  <rect x="${rPlateX}" y="${plateY}" width="${plateW}" height="${plateH}" rx="${plateRx}" fill="#ffffff"/>

  <!-- Gold level-up arrow -->
  <text
    x="${arrowX}" y="${arrowY}"
    font-family="system-ui, -apple-system, sans-serif"
    font-size="${arrowSize}"
    font-weight="900"
    fill="#f59e0b"
    text-anchor="middle"
    dominant-baseline="central"
  >↑</text>
</svg>`
}

const configs = [
  { name: 'icon-192.png',         size: 192, radius: 32 },
  { name: 'icon-512.png',         size: 512, radius: 80 },
  { name: 'icon-maskable-512.png', size: 512, radius: 0  },
]

for (const { name, size, radius } of configs) {
  const svg = svgIcon(size, radius)
  await sharp(Buffer.from(svg))
    .png()
    .toFile(join(outDir, name))
  console.log(`Generated ${name}`)
}

console.log('Icons generated in public/icons/')
