import { normalize } from '@/lib/search'

/** Words that say how someone asks, not what about ("how do I turn off the …"). */
const ASKING = new Set(`a an the i im me my mine we our you your it its is are was be been am to of for on off in at by
with without from into about as do dont does did doing how can cant could would should will want wanna need like
please let change changing set setting settings make making turn turning get getting got keep keeps put stop
show showing hide hiding see find where what which when why there here this that these those just too very so
really any some more less much many all every always never no not and or but if then than up down out over again
app phone thing things stuff way lot`.split(/\s+/))

const wordsOf = (s: string) => normalize(s).split(/[^a-z0-9]+/).filter(Boolean)

/** Two words for the same thing: the same, the start of it (still typing, or a shorter form), or the same stem (vibrating, vibration). */
export function wordsMatch(q: string, w: string): boolean {
  if (q === w) return true
  if (w.startsWith(q)) return q.length >= 2
  let n = 0
  while (n < q.length && n < w.length && q[n] === w[n]) n++
  return n >= 4 && n >= Math.min(q.length, w.length) - 2
}

interface Searchable {
  title: string
  subtitle?: string
  keywords?: string
}

/**
 * The settings that fit a search, best first: a name ("vibration") or a description of the change
 * ("my phone keeps buzzing", "make it darker"). The asking words are dropped, and each word left
 * counts where it's found: in the name 3, the keywords 2, where the setting lives 1, plus 2 when the
 * name holds the whole search. A description then finds a setting by any of its words, and the
 * weak matches (under 40% of the best) are left out.
 */
export function searchSettings<T extends Searchable>(query: string, entries: readonly T[], limit = 6): T[] {
  const words = wordsOf(query).filter(w => !ASKING.has(w))
  if (words.length === 0) return []
  const phrase = words.join(' ')
  const scored = entries
    .map((entry, i) => {
      const title = wordsOf(entry.title)
      const keys = wordsOf(entry.keywords ?? '')
      const where = wordsOf(entry.subtitle ?? '')
      let score = normalize(entry.title).includes(phrase) ? 2 : 0
      for (const q of words) {
        score += title.some(w => wordsMatch(q, w)) ? 3 : keys.some(w => wordsMatch(q, w)) ? 2 : where.some(w => wordsMatch(q, w)) ? 1 : 0
      }
      return { entry, i, score }
    })
    .filter(r => r.score > 0)
  const best = Math.max(0, ...scored.map(r => r.score))
  return scored
    .filter(r => r.score >= best * 0.4)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, limit)
    .map(r => r.entry)
}
