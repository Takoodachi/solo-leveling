import sharp from 'sharp'
import { mkdir } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public', 'icons')

await mkdir(outDir, { recursive: true })

// Purple primary (#7c3aed) on dark background (#0a0a0a)
const BG = { r: 10, g: 10, b: 10 }
const FG = { r: 124, g: 58, b: 237 }

function svgIcon(size, borderRadius = 0) {
  const pad = Math.round(size * 0.18)
  const inner = size - pad * 2
  const cx = size / 2
  const cy = size / 2
  const r = inner / 2

  // Simple "S" letter for Solo Leveling
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${borderRadius}" fill="rgb(${BG.r},${BG.g},${BG.b})"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="rgb(${FG.r},${FG.g},${FG.b})" opacity="0.15"/>
  <text
    x="${cx}" y="${cy}"
    font-family="system-ui, -apple-system, sans-serif"
    font-size="${Math.round(inner * 0.65)}"
    font-weight="700"
    fill="rgb(${FG.r},${FG.g},${FG.b})"
    text-anchor="middle"
    dominant-baseline="central"
  >S</text>
</svg>`
}

const configs = [
  { name: 'icon-192.png', size: 192, radius: 32 },
  { name: 'icon-512.png', size: 512, radius: 80 },
  { name: 'icon-maskable-512.png', size: 512, radius: 0 },
]

for (const { name, size, radius } of configs) {
  const svg = svgIcon(size, radius)
  await sharp(Buffer.from(svg))
    .png()
    .toFile(join(outDir, name))
  console.log(`Generated ${name}`)
}

console.log('Icons generated in public/icons/')
