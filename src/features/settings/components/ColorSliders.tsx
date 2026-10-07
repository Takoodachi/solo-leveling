import { hsl, type Hsl } from '../themeBuilder'

interface Props {
  /** What the colour is for ("Accent"), read out with each slider. */
  label: string
  value: Hsl
  /** How vivid and how bright the colour may get. */
  range: { s: [number, number]; l: [number, number] }
  onChange: (value: Hsl) => void
}

const css = (c: Hsl) => `hsl(${hsl(c)})`
const HUES = [0, 60, 120, 180, 240, 300, 360]
/** Mid brightness for the colour and vividness tracks: a near-black background would leave them unreadable. */
const SHOWN = 50

/** Colour, vividness and brightness sliders. Plain range inputs: the system colour picker isn't in every WebView. */
export default function ColorSliders({ label, value, range, onChange }: Props) {
  const [h, s, l] = value
  const rows: { name: string; at: number; min: number; max: number; track: string; set: (n: number) => Hsl }[] = [
    { name: 'Colour', at: h, min: 0, max: 360, track: HUES.map(hue => css([hue, Math.max(s, 60), SHOWN])).join(', '), set: n => [n, s, l] },
    { name: 'Vividness', at: s, min: range.s[0], max: range.s[1], track: `${css([h, range.s[0], SHOWN])}, ${css([h, range.s[1], SHOWN])}`, set: n => [h, n, l] },
    { name: 'Brightness', at: l, min: range.l[0], max: range.l[1], track: `${css([h, s, range.l[0]])}, ${css([h, s, range.l[1]])}`, set: n => [h, s, n] },
  ]
  return (
    <div className="flex flex-col gap-2 pb-2">
      {rows.map(row => (
        <label key={row.name} className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-xs text-muted-foreground">{row.name}</span>
          <input
            type="range"
            className="color-slider"
            min={row.min}
            max={row.max}
            value={Math.round(row.at)}
            onChange={e => onChange(row.set(Number(e.target.value)))}
            style={{ backgroundImage: `linear-gradient(to right, ${row.track})` }}
            aria-label={`${label}: ${row.name.toLowerCase()}`}
          />
        </label>
      ))}
    </div>
  )
}
