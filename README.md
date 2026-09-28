# Solo Leveling

A personal workout + nutrition tracker PWA for a few friends. Offline-first (IndexedDB), with optional
per-user cloud sync through Supabase. Installable on Android and iOS; all hosting runs on free tiers.

## Run locally

```bash
npm install
cp .env.local.example .env.local   # fill in your Supabase URL + publishable key (or leave empty for local-only)
npm run dev
```

`npm run typecheck`, `npm run lint` and `npm run build` should all pass before deploying.

## Backend: Supabase (free tier)

1. **Schema**: open Supabase → SQL Editor, paste `supabase/migrations/20260921000000_sync_v2.sql`, and run it.
   It's idempotent (safe on an existing project and safe to re-run). It creates/updates every synced table
   and adds row-level security, so each user only ever sees their own rows.
   Then run each later migration in that folder in filename order (`20260922000000_checkins.sql`,
   `20260923000000_home_water.sql`, `20260924000000_volume_radar.sql`, `20260925000000_leaderboard.sql`, …). Run a migration **before** deploying the code that needs it:
   until then, the tables/columns it adds fail to sync.
2. **Auth** → *Sign In / Providers* → Email: keep enabled. **Turn off "Allow new users to sign up".**
3. **Auth** → *Users* → **Add user → Create new user** for each person (email + password,
   tick *Auto Confirm User*). No email service is needed for this.
4. **Auth** → *URL Configuration* (needed for the email sign-in link):
   - **Site URL**: the full app URL **including `https://`**, e.g. `https://solo-leveling.<you>.workers.dev`.
     Without the scheme, Supabase treats it as a path on its own domain and links land on a dead page.
   - **Redirect URLs**: add `https://solo-leveling.<you>.workers.dev/**` (plus `http://localhost:5173/**` for
     local dev). The app asks to return to its own address; anything not listed falls back to the Site URL.

Free projects pause after 7 days without traffic. `.github/workflows/supabase-keepalive.yml` pings the
database every ~3 days. Add two repository secrets for it: `SUPABASE_URL` and `SUPABASE_ANON_KEY`
(the publishable key, never the service_role key).

## Hosting: Cloudflare Workers static assets (free)

Workers & Pages → Create → *Import a repository* → this repo. Settings:

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Non-production branch deploy command | `npx wrangler versions upload` |
| **Build** variables (Settings → Build → Variables and secrets) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |

- `wrangler.jsonc` serves `dist/` as static assets, with `not_found_handling: "single-page-application"` so
  deep links like `/workouts/active` load the app. Don't add a `_redirects` file: Cloudflare rejects
  `/* /index.html 200` as an infinite loop.
- The Supabase values must be **build** variables, not runtime ones: Vite bakes them into the bundle at build time.
- `.nvmrc` pins Node 22 for the build.
- Every push to `main` redeploys; other branches get preview versions.
- `public/_headers` stops the service worker and HTML from being cached, so installed apps pick up updates.
- `netlify.toml` still works if you ever deploy to Netlify instead.

## Install on a phone

- **Android (Chrome)**: open the site → menu → *Add to Home screen* / *Install app*.
- **iPhone (Safari)**: open the site → Share → *Add to Home Screen*. Sign in **inside the installed app**.
  iOS keeps the home-screen app's storage separate from Safari.

## Android app (Samsung Health steps)

An optional Android app for the owner's phone. It's the same site in a Capacitor shell
(`capacitor.config.ts`) that loads the live URL, so every deploy reaches it just like the web app.
It adds one thing: daily steps imported from Samsung Health through Health Connect
(Settings → Steps, only shown in the app). iOS and browsers are unaffected.

**Build** (needs Android Studio for the SDK; the script uses its bundled JDK 21):

```bash
npm run android
```

This writes `solo-leveling.apk`. Only rebuild after **native** changes (plugins, permissions,
icons, `capacitor.config.ts`); web changes just need the usual deploy.

**Install**: copy the APK to the phone and open it (allow *Install unknown apps* for the app you
open it with when Android asks), or connect by USB with developer mode on and run
`npm run android -- --install`. Updating = installing a newer APK over it; data is kept.

**First run**: sign in (the app has its own storage, separate from Chrome's home-screen app),
then Settings → Steps → **Connect** and allow *Steps*. In Samsung Health, turn on
Settings → Health Connect and let it share steps. Steps then import whenever the app is opened.

**Dev**: `CAP_SERVER_URL=http://10.0.2.2:5174 npm run android` builds an APK that loads a local
dev server (`npm run dev -- --host 127.0.0.1 --port 5174`) in the Android emulator.

## How sync works (short version)

- Every write goes to IndexedDB first (`updatedAt`, `syncPending: true`), then a background sync runs.
- Push, then pull. Deletions are sent as tombstones (`deleted = true`) so they reach other devices.
- Pull uses the server's `serverUpdatedAt` as its cursor, so edits made offline and uploaded later still arrive.
- Conflicts are last-write-wins on `updatedAt`, enforced by a server trigger.
- See `src/lib/sync.ts`.
