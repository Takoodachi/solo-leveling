// Supabase Edge Function: parse-food
// Receives a natural-language description of a meal and returns
// estimated macros + notes via Claude tool use.
//
// Deploy: `supabase functions deploy parse-food`
// Secret:  `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`

// deno-lint-ignore-file no-explicit-any
declare const Deno: { env: { get(key: string): string | undefined } }

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5-20251001'

const SYSTEM_PROMPT = `You estimate the macros of a single meal that the user describes in plain English.

Rules:
- Always return WHOLE-PORTION totals for what the user described, never per-100g.
- For ingredients, list 3-6 main components without amounts.
- For notes, give a one-sentence cultural or preparation context if the dish is recognizable; otherwise leave it empty.
- If the input is not a meal (e.g. a question, gibberish, or empty), call the tool with empty/zero values and notes set to "Not a meal".
- Be neutral and brief. Do not editorialize about health or nutrition choices.`

const LOG_FOOD_TOOL = {
  name: 'log_food',
  description: 'Estimate macros and capture context for a meal the user described.',
  input_schema: {
    type: 'object',
    required: ['name', 'kcal', 'protein', 'carbs', 'fat'],
    properties: {
      name:        { type: 'string', description: 'A short, natural display name for the meal.' },
      kcal:        { type: 'number', description: 'Total kilocalories for the portion described.' },
      protein:     { type: 'number', description: 'Total grams of protein.' },
      carbs:       { type: 'number', description: 'Total grams of carbohydrates.' },
      fat:         { type: 'number', description: 'Total grams of fat.' },
      ingredients: { type: 'array',  items: { type: 'string' }, description: 'Short list of main ingredients.' },
      notes:       { type: 'string', description: 'Optional 1-2 sentence cultural or preparation context, or empty.' },
    },
  },
} as const

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  })
}

interface ParsedFood {
  name: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  ingredients?: string[]
  notes?: string
}

function isValidParsed(input: any): input is ParsedFood {
  if (!input || typeof input !== 'object') return false
  if (typeof input.name !== 'string' || input.name.length === 0) return false
  for (const k of ['kcal', 'protein', 'carbs', 'fat']) {
    if (typeof input[k] !== 'number' || !Number.isFinite(input[k]) || input[k] < 0) return false
  }
  return true
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405)
  }

  const auth = req.headers.get('Authorization')
  if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
    return jsonResponse({ ok: false, error: 'Unauthorized' }, 401)
  }

  let body: { text?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON body' }, 400)
  }

  const text = (body.text ?? '').trim()
  if (!text) return jsonResponse({ ok: false, error: 'Empty input' }, 400)
  if (text.length > 500) return jsonResponse({ ok: false, error: 'Input too long' }, 400)

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    console.error('[parse-food] ANTHROPIC_API_KEY not set')
    return jsonResponse({ ok: false, error: 'AI service not configured' }, 500)
  }

  let anthropicResponse: Response
  try {
    anthropicResponse = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 512,
        tool_choice: { type: 'tool', name: 'log_food' },
        // Mark tools + system as cacheable so repeat calls are cheaper.
        system: [
          { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
        ],
        tools: [{ ...LOG_FOOD_TOOL, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: text }],
      }),
    })
  } catch (err) {
    console.error('[parse-food] fetch failed:', err)
    return jsonResponse({ ok: false, error: 'AI service unreachable' }, 502)
  }

  if (!anthropicResponse.ok) {
    const errText = await anthropicResponse.text().catch(() => '')
    console.error('[parse-food] anthropic error', anthropicResponse.status, errText)
    return jsonResponse({ ok: false, error: 'AI service error' }, 502)
  }

  let result: any
  try {
    result = await anthropicResponse.json()
  } catch {
    return jsonResponse({ ok: false, error: 'AI response unreadable' }, 502)
  }

  const toolUse = Array.isArray(result?.content)
    ? result.content.find((c: any) => c?.type === 'tool_use' && c?.name === 'log_food')
    : null

  if (!toolUse?.input || !isValidParsed(toolUse.input)) {
    console.error('[parse-food] missing/invalid tool_use', result)
    return jsonResponse({ ok: false, error: 'AI returned an unreadable response' }, 502)
  }

  return jsonResponse({ ok: true, food: toolUse.input })
})
