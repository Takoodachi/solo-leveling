// Supabase Edge Function: send-reminders
// Sends the web pushes the database hands it (public.sl_send_due_pushes, run every minute by
// pg_cron). It has no database access and keeps nothing: it signs each message with the VAPID
// key and passes it to the browser's push service.
//
// Deploy:  supabase functions deploy send-reminders   (or paste it in Dashboard → Edge Functions)
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (node scripts/generate-vapid.mjs prints a pair)
//          VAPID_SUBJECT (optional): a https:// or mailto: contact the push services may use
//
// Free tier: one invocation per minute at most, and only when a reminder is due.

import webpush from 'npm:web-push@3.6.7'

declare const Deno: {
  env: { get(key: string): string | undefined }
  serve(handler: (req: Request) => Response | Promise<Response>): void
}

interface Message {
  endpoint: string
  p256dh: string
  auth: string
  title: string
  body?: string | null
  url?: string | null
  tag?: string | null
}

const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
const subject = Deno.env.get('VAPID_SUBJECT') ?? 'https://solo-leveling.luongdtran06.workers.dev'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async req => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  if (!publicKey || !privateKey) return json({ error: 'VAPID keys are not set' }, 500)

  let messages: Message[]
  try {
    const body = (await req.json()) as { messages?: Message[] }
    messages = Array.isArray(body.messages) ? body.messages.slice(0, 500) : []
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const results = await Promise.allSettled(
    messages.map(m =>
      webpush.sendNotification(
        { endpoint: m.endpoint, keys: { p256dh: m.p256dh, auth: m.auth } },
        JSON.stringify({ title: m.title, body: m.body ?? '', url: m.url ?? '/home', tag: m.tag ?? undefined }),
        // A reminder is only useful around its time: let the push service drop it after an hour
        { TTL: 3600, urgency: 'high', vapidDetails: { subject, publicKey, privateKey } },
      ),
    ),
  )

  const failed = results.filter(r => r.status === 'rejected')
  for (const f of failed) console.warn('push failed:', (f as PromiseRejectedResult).reason?.statusCode ?? f)
  return json({ sent: results.length - failed.length, failed: failed.length })
})
