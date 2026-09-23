import type { MuscleRegion } from '../standards'

/**
 * Stylised front/back figures on a 160 × 300 artboard, centred on x = 80.
 * Shapes are the figure's left half (viewer's left); the right half is mirrored.
 */

export interface Shape {
  region?: MuscleRegion // undefined = neutral body part (head, hands, knees…)
  points?: string
  ellipse?: [cx: number, cy: number, rx: number, ry: number]
}

export const MIRROR = 'translate(160 0) scale(-1 1)'

/** Drawn once, not mirrored. */
export const CENTER_PARTS: Shape[] = [
  { ellipse: [80, 22, 12, 15] }, // head
  { points: '74,34 86,34 88,47 72,47' }, // neck
]

const SHARED_BASE: Shape[] = [
  { ellipse: [40, 145, 5, 8] }, // hand
  { ellipse: [69, 215, 7, 6] }, // knee
  { ellipse: [69, 283, 7, 5] }, // foot
]

const SIDE_DELT: Shape = { region: 'side-delts', points: '60,50 51,52 45,60 44,70 50,68 54,58' }
const FOREARM: Shape = { region: 'forearms', points: '42,100 52,100 54,108 51,126 45,136 39,134 37,118' }

export const FRONT: Shape[] = [
  ...SHARED_BASE,
  { points: '64,136 72,134 80,138 80,152 67,150' }, // hips
  { region: 'traps', points: '72,43 60,51 73,49' },
  SIDE_DELT,
  { region: 'front-delts', points: '60,50 54,58 50,68 57,74 63,64 68,53' },
  { region: 'chest', points: '68,53 63,64 61,75 69,82 80,82 80,52' },
  { region: 'biceps', points: '44,71 50,69 57,75 56,88 52,98 45,98 42,86' },
  FOREARM,
  { region: 'abs', points: '71,84 80,84 80,134 73,134 71,110' },
  { region: 'obliques', points: '61,77 70,84 70,110 72,133 65,135 61,120 59,96' },
  { region: 'quads', points: '64,138 68,151 80,155 79,180 76,206 64,210 58,190 58,160' },
  { region: 'calves', points: '63,222 76,222 75,250 72,274 66,274 61,250' },
]

export const BACK: Shape[] = [
  ...SHARED_BASE,
  { region: 'traps', points: '73,40 60,50 67,58 80,88 80,40' },
  SIDE_DELT,
  { region: 'rear-delts', points: '60,50 54,58 50,68 57,72 64,64 67,58' },
  { region: 'lats', points: '67,59 80,89 80,112 72,120 64,106 60,86 62,73 64,65' },
  { region: 'lower-back', points: '72,121 80,113 80,136 70,136 68,128' },
  { region: 'triceps', points: '44,71 50,69 57,73 56,88 52,98 45,98 42,86' },
  FOREARM,
  { region: 'glutes', points: '64,137 70,137 80,139 80,161 72,167 62,161 59,147' },
  { region: 'hamstrings', points: '60,163 72,169 79,167 78,188 75,208 65,210 59,190' },
  { region: 'calves', points: '62,221 77,221 78,238 75,258 70,274 64,264 61,240' },
]

/** Six-pack lines drawn over the abs (front view). */
export const AB_LINES = 'M71,97 L89,97 M71,110 L89,110 M72,122 L88,122 M80,84 L80,134'
