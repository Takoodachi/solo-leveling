import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

const REQUEST_TIMEOUT_MS = 20_000

/**
 * fetch has no timeout, so on a flaky mobile connection a request can hang
 * forever. Abort after REQUEST_TIMEOUT_MS; sync reports the error and retries later.
 */
function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (init?.signal || typeof AbortSignal.timeout !== 'function') return fetch(input, init)
  return fetch(input, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
}

// Fallback placeholder values prevent createClient from throwing at module load time.
// The client carries no table types: rows are typed where they're read (lib/sync.ts and the features).
export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseKey ?? 'placeholder-key',
  { global: { fetch: fetchWithTimeout } },
)
