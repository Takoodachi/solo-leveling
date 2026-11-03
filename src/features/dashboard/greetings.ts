import { differenceInCalendarDays, parseISO } from 'date-fns'

/**
 * Home's greeting: a different one each day and the same all day, picked from the date alone, so
 * every device shows the same one. Each comes up once before any repeats, in an order shuffled
 * afresh each round, and never two days running. No time of day in them, since one lasts the
 * whole day, and nothing about eating or weighing less.
 */
export interface Greeting {
  text: string
  emoji?: string
}

/** `{name}` is the first name; without one, ", {name}" (or " {name}") is left out. */
export const GREETINGS: Greeting[] = [
  { text: 'Hi, {name}', emoji: '👋' },
  { text: 'Hey, {name}', emoji: '✌️' },
  { text: 'Hello, {name}', emoji: '🙌' },
  { text: 'Yo, {name}', emoji: '🤙' },
  { text: 'Howdy, {name}', emoji: '🤠' },
  { text: 'What’s up, {name}?', emoji: '😎' },
  { text: 'Welcome back, {name}' },
  { text: 'Good to see you, {name}', emoji: '😄' },
  { text: 'Glad you’re here, {name}', emoji: '🙂' },
  { text: 'Arise, {name}', emoji: '⚔️' },
  { text: 'Welcome, Hunter {name}', emoji: '🗡️' },
  { text: 'System online, {name}', emoji: '🔷' },
  { text: 'Ready to level up, {name}?', emoji: '⚡' },
  { text: 'Quest time, {name}', emoji: '📜' },
  { text: 'Your XP awaits, {name}', emoji: '🎮' },
  { text: 'Let’s go, {name}', emoji: '🔥' },
  { text: 'Gear up, {name}', emoji: '🎧' },
  { text: 'Keep climbing, {name}', emoji: '⛰️' },
  { text: 'Onward, {name}', emoji: '🚀' },
  { text: 'Stay strong, {name}', emoji: '💪' },
  { text: 'You’ve got this, {name}', emoji: '💯' },
  { text: 'Make it count, {name}', emoji: '✨' },
  { text: 'Time to shine, {name}', emoji: '🌟' },
  { text: 'Every rep counts, {name}', emoji: '📈' },
  { text: 'One rep at a time, {name}', emoji: '🏋️' },
  { text: 'Keep growing, {name}', emoji: '🌱' },
  { text: 'Back at it, {name}?', emoji: '💥' },
  { text: 'Strength loading, {name}…', emoji: '⏳' },
  { text: 'Train smart, {name}', emoji: '🧠' },
  { text: 'Ahoy, {name}', emoji: '⚓' },
]

const EPOCH = new Date(2026, 0, 1)

/** One round's order of the greetings: a shuffle seeded by the round, so it's the same everywhere. */
function shuffled(round: number): number[] {
  // mulberry32
  let seed = Math.imul(round, 0x9e3779b1)
  const random = () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const order = GREETINGS.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

/** The greeting for a day (YYYY-MM-DD), with the name filled in. */
export function greetingFor(date: string, name: string): Greeting {
  const n = GREETINGS.length
  const day = differenceInCalendarDays(parseISO(date), EPOCH)
  const round = Math.floor(day / n)
  const order = shuffled(round)
  // A round doesn't open on the greeting the last one ended with (swapping its first two keeps its own last)
  if (order[0] === shuffled(round - 1)[n - 1]) [order[0], order[1]] = [order[1], order[0]]
  const greeting = GREETINGS[order[day - round * n]]
  return { ...greeting, text: name ? greeting.text.replace('{name}', name) : greeting.text.replace(/,? \{name\}/, '') }
}
