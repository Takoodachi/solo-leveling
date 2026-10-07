// Draws the Android app's long-press shortcut icons (res/drawable/ic_shortcut_<id>.xml): the
// accent disc with a white Lucide glyph, the same glyph the app shows for that shortcut.
// Run: node scripts/generate-shortcut-icons.mjs   (then rebuild the app: npm run android)
//
// workout, food and weight are drawn by hand and aren't touched. To add a shortcut, add it to
// src/features/settings/appShortcuts.ts, to ICONS in android/…/Shortcuts.kt, and here.
import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const lucide = join(root, 'node_modules', 'lucide-react', 'dist', 'esm', 'icons')
const out = join(root, 'android', 'app', 'src', 'main', 'res', 'drawable')

/** Shortcut id → Lucide icon file. */
const ICONS = {
  water: 'glass-water',
  steps: 'footprints',
  recap: 'calendar-check',
  ranks: 'biceps-flexed',
  leaderboard: 'trophy',
  analytics: 'chart-column',
}

/** Lucide ships each icon as a list of SVG elements; Android vectors only take paths. */
function toPath([tag, a]) {
  const n = key => Number(a[key] ?? 0)
  if (tag === 'path') return a.d
  if (tag === 'line') return `M${n('x1')} ${n('y1')}L${n('x2')} ${n('y2')}`
  if (tag === 'circle') return `M${n('cx') - n('r')} ${n('cy')}a${n('r')} ${n('r')} 0 1 0 ${2 * n('r')} 0a${n('r')} ${n('r')} 0 1 0 ${-2 * n('r')} 0`
  if (tag === 'rect') {
    const [x, y, w, h, r] = [n('x'), n('y'), n('width'), n('height'), n('rx')]
    const corner = (dx, dy) => (r ? `a${r} ${r} 0 0 1 ${dx * r} ${dy * r}` : '')
    return `M${x + r} ${y}h${w - 2 * r}${corner(1, 1)}v${h - 2 * r}${corner(-1, 1)}h${2 * r - w}${corner(-1, -1)}v${2 * r - h}${corner(1, -1)}z`
  }
  throw new Error(`Can't draw a <${tag}>`)
}

for (const [id, name] of Object.entries(ICONS)) {
  const source = readFileSync(join(lucide, `${name}.mjs`), 'utf8')
  const nodes = new Function(`return ${/const __iconNode = (\[[\s\S]*?\n\]);/.exec(source)[1]}`)()
  const glyph = nodes
    .map(node => `        <path android:strokeColor="#FFFFFFFF" android:strokeWidth="2.2" android:strokeLineCap="round" android:strokeLineJoin="round" android:pathData="${toPath(node)}" />`)
    .join('\n')
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<!-- App shortcut icon: Lucide "${name}" (scripts/generate-shortcut-icons.mjs) -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="48dp"
    android:height="48dp"
    android:viewportWidth="48"
    android:viewportHeight="48">
    <path android:fillColor="#FFFF5F1A" android:pathData="M24,24m-22,0a22,22 0,1 1,44 0a22,22 0,1 1,-44 0" />
    <group android:translateX="12" android:translateY="12">
${glyph}
    </group>
</vector>
`
  writeFileSync(join(out, `ic_shortcut_${id}.xml`), xml)
  console.log(`ic_shortcut_${id}.xml  (${name}, ${nodes.length} paths)`)
}
