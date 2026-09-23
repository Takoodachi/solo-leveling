# CLAUDE.md

This file gives AI assistants the context needed to work productively on this project. Read it before making changes.

---

## Project Overview

**Name:** Solo Leveling
**Type:** Personal workout + nutrition tracker with gamification
**Platform:** Progressive Web App (PWA), installed on Android (owner) and iOS/Safari (friends)
**Scope:** A small private group: the owner plus friends (6–7 users expected). **Each user's data is private.** There's no sharing and no social features (yet). Offline-first, with **optional per-user cloud sync** (the owner uses a phone + laptop). No app store deployment planned. **Infrastructure must stay on free tiers.**

> **History:** Started as a workout logger + calorie tracker. Workouts were removed in June 2026, then **reintroduced in September 2026** at the owner's request, together with a redesign (dark charcoal + orange/coral, mobile-first) based on reference mockups. Nutrition, body weight and steps remain first-class.

**Core principle:** This is a personal tool, not a product. Optimize for the owners' actual habits over generality. Avoid feature creep. Prefer simple, working code over abstraction.

---

## Tech Stack

- **Framework:** React 19 + Vite 8
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS 3 + shadcn/ui components; fonts self-hosted via `@fontsource-variable/inter` and `@fontsource-variable/outfit` (no font CDN)
- **State:** Zustand for UI/ephemeral state (stores per domain: nutrition, workouts (active session), auth, sync status)
- **Persistence:** Dexie.js (IndexedDB wrapper). Local-first; all data works fully offline
- **Sync/Auth:** **Supabase** (free tier). Email + password auth; per-user cloud sync. Gated by env vars; if unset, the app runs purely local. Users can also choose "Continue without an account" (local-only mode)
- **Charts:** Recharts
- **PWA:** vite-plugin-pwa (injectManifest, `src/sw.ts`)
- **Routing:** React Router v7
- **Icons:** lucide-react
- **Date utilities:** date-fns (not moment, not dayjs)
- **Hosting:** Cloudflare Workers static assets (free): `wrangler.jsonc` (SPA fallback via `not_found_handling`, **no `_redirects` file**, since Cloudflare rejects `/* /index.html 200`), `public/_headers`, `.nvmrc`. `netlify.toml` kept as a fallback

**Do not add** Redux, MobX, or styled-components. Supabase is the only backend/auth dependency. Don't add others, and flag any new backend need instead of bolting it on. Anything paid (e.g. the Anthropic-backed `parse-food` Edge Function) must stay behind a flag and off by default (`VITE_ENABLE_AI_FOOD`).

---

## Project Structure

```
src/
  app shell: App.tsx (routes), main.tsx, sw.ts, index.css (theme tokens)
  components/       # Reusable UI (PascalCase): AppShell, BottomNav, QuickAddSheet, PageHeader, Segmented, ProgressRing, …
    ui/             # shadcn primitives (restyled: white pill buttons, rounded-3xl cards)
  features/
    auth/           # authStore, useAuthInit (single auth subscription + sync triggers), useAuth, LoginPage
    workouts/       # routines, active-workout store (persisted), logger components, history, plan
    challenges/     # personal challenges (progress computed from local data)
    ranks/          # strength ranks: standards, scoring, badges, Ranks screen, rank-ups
    checkins/       # daily check-ins: creatine tick, water counter
    nutrition/      # food logging, daily totals, targets
    dashboard/      # Home: widget registry (homeWidgets.ts), customize sheet, week strip, activity cards, weekly overview, dynamic-target hooks
    analytics/      # volume, 1RM, macro adherence, weight, steps charts
    gamification/   # achievements, XP/levels
    bodyMetrics/    # body weight logging + trend
    settings/       # Profile page cards, useSettings, export/import
  db/               # Dexie schema (versions 1–12), seed + wipe
  lib/              # Pure utilities + services: sync.ts, syncStatus.ts, workoutMath.ts, macroTargets.ts, streak.ts, xp.ts, …
  data/             # Static seed data: foods (~285, incl. Vietnamese dishes; foodsMore.ts), exercises (288; exerciseVariations.ts), routine templates
  pages/            # Route-level components
  hooks/            # Cross-feature hooks (useNow, useGoBack)
  types/            # Shared types
supabase/
  migrations/       # SQL to run in the Supabase SQL editor (idempotent)
  functions/        # parse-food (optional, paid; Deno)
.github/workflows/  # supabase-keepalive.yml (stops free-tier pausing)
```

Keep feature code colocated. A workout-specific hook lives in `features/workouts/hooks`, not in the top-level `hooks/`.

---

## Navigation & screens

Bottom nav: **Home · Workouts · (+) · Analytics · Profile**. The **+** opens a quick-add sheet: start/resume workout, log food, log weight, log steps, log water. Nutrition has no tab. It's reached from the Home calories card and the + sheet.

- **Home**: greeting, *Today's Plan / Weekly Stats* toggle, Mon–Sun week strip (✓ = trained; missed days stay neutral). *Today's Plan* shows the cards the user picked, in their order (`settings.homeWidgets`; unset = all): today's workout, steps, calories, water, creatine, macros, challenge, strength rank, streak/level. Tiles (steps, calories, water, creatine) pair two per row; a lone tile spans the row. **Customize** (Home header or Profile) edits the list. Add a new card in `features/dashboard/homeWidgets.ts` + `TodayWidgets.tsx`
- **Workouts**: category chips, my routines, templates (in code, never synced), recent history; **Plan** (weekly schedule, frequency goal, rest timer, reminder prefs)
- **Routine detail / editor**, **active logger** (full screen, wake lock, rest timer, "Previous" column), **summary** (completion screen / history detail)
- **Cardio is not sets.** Exercises with `type: 'cardio'` are logged as one entry: time, optional distance, effort (Easy/Moderate/Hard, saved in `rpe`). Pace and kcal update live. Routine editor asks for a duration only; routine time uses that duration. kcal = each cardio entry's MET (by speed when distance is logged, else by effort; `lib/cardio.ts`) + the rest of the session at the lifting MET. Summary shows cardio time/distance/pace; new bests include longest distance and fastest pace. Timed holds (plank, `defaultUnit: 'min'`, not cardio) stay as sets with one "min" column.
- **Analytics**: weekly volume, est. 1RM progression, macro adherence, body weight, steps
- **Profile**: name, level/XP, strength rank, account & sync status, achievements, body & goals, daily targets, home screen (customize), backup
- **Ranks** (`/ranks`): overall rank, ranked **Bodygraph** (front/back figures, 16 muscles coloured by tier, tap for detail), muscle rankings (6 groups, "2/3 ranked"), weekly rank-progress chart, every ranked lift with its next-division target, how ranks work

Full-screen routes (no nav) use `components/FullScreen`. All screens must respect safe areas (`pt-safe`, `pb-safe`, `env(safe-area-inset-*)`).

**Screens scroll the document**, never a fixed-height inner container: use `min-h-dvh`, not `h-dvh` + `overflow-y-auto`. iOS Safari (browser and home-screen app) mis-sizes fixed-height shells and can hide the bottom nav behind its toolbar. Sticky headers carry their own `pt-safe`; a global scrim covers the status bar; `ScrollToTop` resets scroll on navigation; bottom sheets are capped to the screen height in `ui/sheet.tsx`.

---

## Data Model (Dexie schema)

Defined in `src/db/schema.ts`, currently at **version 12**. When changing it, bump the version and write a migration (`.stores({ table: null })` to drop a table). Never silently mutate the schema.

```ts
// Synced collections (key: uuid string)
foods, foodLog, bodyMetrics, dailyActivity, achievements,
exercises (built-ins seeded, only custom ones sync), workouts, workoutSets, routines, challenges,
checkins (daily habits: `creatine-YYYY-MM-DD` tick, unticking sets done = false; `water-YYYY-MM-DD` with `amount` in ml)
// Synced singletons (id = 1)
userStats, targets, settings
// Local-only
workoutDrafts (id = 1, the in-progress workout), pendingDeletes (sync tombstones)
```

- **Index dates as ISO strings** (`YYYY-MM-DD`) for day-level queries; store timestamps as `number` (`Date.now()`).
- IndexedDB can't index booleans. Filter (`.filter(r => r.isFavorite)`) instead of `where('flag').equals(1)`.
- Per-day rows use deterministic ids so two devices don't create duplicates: `weight-YYYY-MM-DD`, `steps-YYYY-MM-DD`, `ach-<key>`.
- Seeded singletons use `updatedAt: 0` so a fresh device always adopts the server copy.

---

## Sync (Supabase)

- **Offline-first:** Dexie is the source of truth on-device.
- **Writes:** stamp `updatedAt: Date.now()`, set `syncPending: true`, then call `requestSync()` from `lib/sync.ts`. **Deletes:** use `deleteSynced(table, remoteName, uuids)`, never a bare `table.delete()`, or the row comes back from other devices.
- **Sync run:** push pending rows → push tombstones → pull by server cursor (`serverUpdatedAt`, keyset-paginated, 5-min overlap). Pulled rows never overwrite a newer pending local edit. A sync requested mid-run re-runs afterwards. Sync also runs on sign-in, reconnect and app foreground.
- **Server:** `supabase/migrations/20260921000000_sync_v2.sql` defines the base tables; later files in that folder add to it (run in filename order). Collections are keyed by `(user_id, uuid)`, singletons by `user_id`. A trigger stamps `serverUpdatedAt` and ignores stale writes (last-write-wins). RLS: `user_id = auth.uid()` on every table. Columns are camelCase (quoted) because rows sync as-is.
- **Adding a synced field:** add it to the TS type, the column list in `lib/sync.ts`, and a new idempotent migration (`add column if not exists`). PostgREST rejects unknown columns, so keep all three in agreement.
- **Accounts:** data on a device belongs to one account (`solo:localOwner`). Signing in as a different account wipes local data first; signing out wipes it too (with a warning if changes are unsynced). Local-only data is adopted by the first account that signs in.
- **Auth:** email + password (magic links don't work inside iOS home-screen apps, and Supabase's built-in mailer only reaches org members). Accounts are created in the Supabase dashboard; public sign-up is disabled.
- **Keep-alive:** a GitHub Action pings the DB every ~3 days so the free project doesn't pause.

---

## Gamification Layer

1. **Streaks**: a day counts as "logged" when food **or a workout** is logged. One streak freeze per ISO week (max 2 banked), tracked on `userStats.freezeWeek` so it's granted once across devices. Freezes are consumed automatically on missed days (`lib/streak.ts`).
2. **XP & Levels**: workout finished +50, +2 per set, +25 per new best (est. 1RM), rank-ups (see 5); daily kcal target within ±10% +30; protein target +20. Level curve: `xpForLevel(n) = 100 * n^1.5` (`lib/xp.ts`).
3. **Achievements**: declarative in `features/gamification/achievements.ts`, evaluated in `lib/achievementEval.ts` (first/10/50 workouts, 100 sets, streaks, levels, first food log, protein streak, first weigh-in, Gold/Diamond lift, overall Gold).
4. **Personal challenges**: user-set target + deadline (workouts, steps, volume, food-logged days, protein days); progress computed from local data. **Personal only.** Shared challenges are a possible future feature.
5. **Strength ranks** (inspired by LiftOff): every set gets a 1–1000 rating from its est. 1RM (Epley, reps capped at 20), bodyweight reps, or hold time, against standards for the lifter's **sex and bodyweight on that day** (`features/ranks/standards.ts`, `scoring.ts`). Nine tiers (Wood → Olympian, 100-pt bands from 200) × three divisions. A lift's rank is its best set ever (ranks never drop). Each standard lists the **muscle regions** it ranks (16 regions in 6 groups: chest, shoulders, arms, back, core, legs); a region takes its best lift, a group its best region, overall = weighted mean once 3 groups are ranked. Ranks are absolute (vs. standards, not vs. other users), so they work the same for any number of users. Derived on-device, nothing stored or synced. Rank-ups toast live in the logger, show on the summary, and give XP (+30 per lift division, +75 per overall division). Needs `settings.sex` + one weigh-in. Only built-in exercises with a standard are ranked; add more in `standards.ts` (own data or `like` + factor).

### Dynamic activity-driven targets

When `settings.dynamicTargetsEnabled` is on, the daily target is the baseline plus an **activity bonus** from steps (`lib/macroTargets.ts`): `steps × bodyWeightKg × KCAL_PER_STEP_PER_KG`, averaged over `activityWindowDays`. Extra kcal goes to carbs and fat in the baseline ratio. Protein stays fixed. Everywhere a target is shown, use `useEffectiveTargets` (dashboard hooks). Don't read the raw baseline.

### What the web platform can't do (don't promise it)

- **Heart rate / sleep**: there's no web API for Health Connect or Apple Health. Heart rate is an optional manual field on a finished workout; calories burned are a MET-based **estimate** (`lib/workoutMath.ts`), always labeled "est.".
- **Scheduled reminders**: need Web Push from a server scheduler (Supabase pg_cron + Edge Function + VAPID). Prefs are stored; delivery is a TODO. iOS only supports push for home-screen-installed apps (16.4+).
- **Steps**: manual entry (no step-counter API on the web).

---

## Coding Conventions

**TypeScript**: strict; no `any` (use `unknown` and narrow). `type` for unions/intersections, `interface` when extension is expected.

**React**
- Function components only. Hooks live with their feature.
- Keep components under ~150 lines; extract subcomponents or hooks past that.
- Side effects belong in hooks. Don't call `setState` synchronously inside an effect, and don't call `Date.now()` / `new Date()` during render. Use `useNow()` (the React hooks lint rules enforce most of this).

**State**: persistent data flows through Dexie via hooks backed by `useLiveQuery`. Zustand holds UI/session state only (the active-workout draft is mirrored to Dexie for crash safety).

**Styling**
- Tailwind + theme tokens in `index.css` (`bg-card`, `text-muted-foreground`, `primary` = orange accent). Primary buttons are white pills (`Button` default); orange is for accents, progress, and active states.
- Mobile-first (~390px). Touch targets ≥ 44px. Inputs must be ≥ 16px font (iOS zooms otherwise).
- Dark mode is the default and the design target.

**Naming**: components `PascalCase.tsx`, hooks `useThing.ts`, utilities `camelCase.ts`.

**Imports**: use the `@/` alias; no deep relative paths.

---

## PWA Requirements

- Fully functional offline after first load. The service worker precaches every chunk and serves `index.html` for in-app navigations.
- Network calls only for: Supabase sync/auth (when signed in) and optional Open Food Facts barcode lookups.
- iOS: `viewport-fit=cover`, `apple-mobile-web-app-*` meta, `apple-touch-icon.png` (180×180, generated by `scripts/generate-icons.mjs`).
- Manual JSON export/import in Profile as a backup path independent of sync. Import merges; it doesn't wipe.

---

## What NOT to Do

- Don't add **sharing or social** features (friends' data visible to each other, leaderboards) without being asked. Every user's data stays private (RLS).
- Don't add ads, analytics, telemetry, or third-party trackers.
- Don't add paid services or anything that breaks the $0 budget. Flag it instead.
- Don't add guilt mechanics or aggressive notifications (no red ✗ for missed days, no shame UI).
- Don't add aggressive calorie restriction features, weight-loss-focused defaults, or before/after framing. Keep nutrition tracking neutral.
- Don't add achievements tied to extreme restriction. Reward consistency and progress.
- Don't refactor wide swaths of the codebase without being asked. Make surgical changes.
- Don't add dependencies without flagging them first.

---

## Working With the Owner

- Personal project: favor speed and iteration over polish for unused features.
- For non-trivial decisions, briefly explain the tradeoff; don't ask permission for every small thing.
- If a request is ambiguous, make a reasonable assumption, state it, and proceed.
- If something here conflicts with a direct request from the owner, the owner wins. Call out the conflict so this file can be updated.
- Prefer TODO comments over half-implemented features in committed code.

---

## Build & Run

```bash
npm install
npm run dev        # Vite dev server
npm run build      # Production build (tsc -b + vite build)
npm run preview    # Test built PWA locally
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint
```

Setup of Supabase, Cloudflare Pages and the keep-alive job is in `README.md`.

---

## Current Status

**Phase:** Redesign + infrastructure fix (September 2026).
**Working:** offline-first logging (workouts, food, weight, steps, water), customizable Home, routines + templates + weekly plan, live logger with rest timer, completion summary with new bests, personal challenges, analytics, streaks/XP/achievements, strength ranks, creatine check-in, v2 sync (tombstones, server cursor, per-user keys), password auth + local-only mode.
**Next steps:** create the three accounts; finish the move to Cloudflare (Workers) and retire Netlify once the owner's phone has synced; add the keep-alive secrets; create accounts for the new friends (Supabase dashboard). (All migrations through `20260923000000_home_water.sql`: done.)
**Future ideas (not started):** reminder push delivery, shared challenges, adaptive TDEE, bodyweight goals + projection, faster food logging (templates / "copy yesterday"), AI workout builder (explicitly deferred).
