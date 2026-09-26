/** Lowercase and strip accents, so "pho" finds "Phở" and "dui ga" finds "Đùi gà". */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase()
}

/**
 * How well `query` matches an item (0 = no match). Every query word has to appear
 * in the title or the keywords; hits at the start of the title or of a title word
 * rank higher than hits inside words or in the keywords.
 */
export function matchScore(query: string, title: string, keywords = ''): number {
  const q = normalize(query).trim()
  const words = q.split(/\s+/).filter(Boolean)
  if (words.length === 0) return 0
  const t = normalize(title)
  const titleWords = t.split(/[^a-z0-9]+/)
  const k = normalize(keywords)
  let score = t === q ? 50 : 0
  for (const w of words) {
    if (t.startsWith(w)) score += 30
    else if (titleWords.some(x => x.startsWith(w))) score += 20
    else if (t.includes(w)) score += 10
    else if (k.includes(w)) score += 4
    else return 0
  }
  return score
}
