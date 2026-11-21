/**
 * The app's own sounds (November 2026): a chime when a stretch's hold runs out, for when the phone
 * is out of sight. Made with Web Audio, so there's no file to load and it works offline. A page may
 * only make sound once it has been touched (iOS, and Chrome's autoplay rule), so the tap that starts
 * a hold calls `unlockSound` first. It plays at media volume, and an iPhone on silent stays silent.
 */
let ctx: AudioContext | null = null

/** Call from a tap: makes the page able to play sound from then on. */
export function unlockSound(): void {
  try {
    ctx ??= new AudioContext()
    if (ctx.state !== 'running') void ctx.resume()
  } catch {
    // No Web Audio here: the buzz and the screen still say it
  }
}

/** A soft two-note chime, rising: a hold is over. */
export function chime(): void {
  if (!ctx || ctx.state !== 'running') return
  const now = ctx.currentTime
  for (const [freq, delay] of [[784, 0], [1175, 0.14]] as const) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = freq
    // A quick swell and a long fade, like a small bell
    gain.gain.setValueAtTime(0.0001, now + delay)
    gain.gain.exponentialRampToValueAtTime(0.3, now + delay + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.8)
    osc.connect(gain).connect(ctx.destination)
    osc.start(now + delay)
    osc.stop(now + delay + 0.85)
  }
}
