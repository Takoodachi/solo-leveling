/**
 * The site's Worker. Everything is still served as static files (wrangler.jsonc sends only
 * `/api/*` here); this exists for the one thing a browser can't do itself: ask Open Food
 * Facts' fast search (Search-a-licious), which answers in a fraction of a second but sends no
 * CORS headers. The search the browser can call directly turns away about half of all requests.
 *
 * GET /api/food-search?q=greek yogurt  →  { products: [...] }, each one shaped like an Open Food
 * Facts product (code, names, brands, quantity, nutriments), so the site reads them with the
 * parser it already has. Only this one upstream, only this one query: it can't be used to fetch
 * anything else.
 */

const UPSTREAM = 'https://search.openfoodfacts.org/search'
const FIELDS = 'code,product_name,product_name_en,generic_name,generic_name_en,brands,quantity,nutriments,countries_tags'
/** Asked for, so there's enough left after the entries without any nutrition are dropped by the site. */
const ASKED = 40
const MAX_QUERY = 80
const UPSTREAM_TIMEOUT_MS = 8000
/** Open Food Facts asks every client to say who it is. */
const USER_AGENT = 'SoloLeveling/0.3 (personal fitness tracker; https://github.com/Takoodachi/solo-leveling)'

/**
 * Where a visitor's own products sit in Open Food Facts, by the country Cloudflare sees them
 * in. The people using this are in Vietnam and the USA; elsewhere results keep their order.
 * (Many Vietnamese products are filed under the US Virgin Islands there: both use "VI".)
 */
const HOME_TAGS = {
  VN: ['en:vietnam', 'en:virgin-islands-of-the-united-states'],
  US: ['en:united-states'],
}

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } })

/** The words of a search, without the characters the search engine reads as syntax. */
function cleanQuery(raw) {
  return (raw ?? '').replace(/[+\-!(){}[\]^"~*?:\\/]|&&|\|\|/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY)
}

const NUTRIENTS = ['energy-kcal', 'energy-kj', 'energy', 'proteins', 'carbohydrates', 'fat']

/** One search hit as the site expects a product: brands as text, and only the numbers it reads. */
function toProduct(hit) {
  const nutriments = {}
  for (const name of NUTRIENTS) {
    for (const basis of ['100g', 'serving']) {
      const value = hit.nutriments?.[`${name}_${basis}`]
      if (value != null) nutriments[`${name}_${basis}`] = value
    }
  }
  return {
    code: hit.code,
    product_name: hit.product_name,
    product_name_en: hit.product_name_en,
    generic_name: hit.generic_name,
    generic_name_en: hit.generic_name_en,
    brands: Array.isArray(hit.brands) ? hit.brands.join(', ') : hit.brands,
    quantity: hit.quantity,
    nutriments,
  }
}

async function foodSearch(request) {
  if (request.method !== 'GET') return json({ error: 'GET only' }, 405, { allow: 'GET' })
  const q = cleanQuery(new URL(request.url).searchParams.get('q'))
  if (q.length < 2) return json({ error: 'q needs at least two characters' }, 400)

  const country = request.cf?.country
  const upstream = new URL(UPSTREAM)
  upstream.searchParams.set('q', q)
  // Names are searched in both languages; the visitor's own first
  upstream.searchParams.set('langs', country === 'VN' ? 'vi,en' : 'en,vi')
  upstream.searchParams.set('page_size', String(ASKED))
  upstream.searchParams.set('fields', FIELDS)

  let hits
  try {
    const res = await fetch(upstream, { headers: { 'user-agent': USER_AGENT, accept: 'application/json' }, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) })
    if (!res.ok) return json({ error: `Open Food Facts answered ${res.status}` }, 502)
    hits = (await res.json()).hits
  } catch {
    return json({ error: 'Open Food Facts did not answer' }, 502)
  }
  if (!Array.isArray(hits)) return json({ error: 'Unexpected answer from Open Food Facts' }, 502)

  // The visitor's own country first, each group in the order the search ranked it
  const home = HOME_TAGS[country] ?? []
  const local = h => Array.isArray(h.countries_tags) && h.countries_tags.some(t => home.includes(t))
  const ordered = [...hits.filter(local), ...hits.filter(h => !local(h))]
  // The same words give the same list for a while: the browser can keep it
  return json({ products: ordered.map(toProduct) }, 200, { 'cache-control': 'private, max-age=3600' })
}

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname === '/api/food-search') return foodSearch(request)
    // Nothing else is routed here; anything that is goes on to the static files
    return env.ASSETS.fetch(request)
  },
}
