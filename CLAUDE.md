# CLAUDE.md

This file gives AI assistants the context needed to work productively on this project. Read it before making changes.

---

## Project Overview

**Name:** Solo Leveling
**Type:** Personal calorie/macro + bodyweight tracker with gamification
**Platform:** Progressive Web App (PWA), installable on Android
**Scope:** Single-user, personal use only. Offline-first, but with **optional per-user cloud sync** (the owner uses a phone + a laptop and wants data to stay consistent across both). No multi-user/social features, no app store deployment planned.

> **History:** This started as a workout logger + calorie tracker. Workout logging was removed (it went unused); the app is now focused on **nutrition/macros, body weight, and step-driven activity**. Don't reintroduce workout/exercise/PR concepts without being asked.

**Core principle:** This is a personal tool, not a product. Optimize for the owner's actual habits over generality. Avoid feature creep. Prefer simple, working code over abstraction.

---

## Tech Stack

- **Framework:** React 18 + Vite
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS + shadcn/ui components
- **State:** Zustand for UI/ephemeral state (stores per domain: nutrition, gamification, settings, auth)
- **Persistence:** Dexie.js (IndexedDB wrapper) — local-first, all data works fully offline
- **Sync/Auth:** **Supabase** — optional, opt-in. Provides single-user auth and per-user cloud sync of the local data. *Approved deviation from the original "local-only, no backend" design* (the owner needs phone↔laptop consistency). Gated by env vars; if unset, the app runs purely local.
- **Charts:** Recharts
- **PWA:** vite-plugin-pwa with Workbox for offline support
- **Routing:** React Router v6
- **Icons:** lucide-react
- **Date utilities:** date-fns (not moment, not dayjs)

**Do not add** Redux, MobX, or styled-components. Supabase is the only backend/auth dependency — don't add others, and flag any new backend need instead of bolting it on.

---

## Project Structure

```
src/
  app/              # App shell, router, providers
  components/       # Reusable UI (PascalCase)
    ui/             # shadcn primitives
  features/         # Feature modules — preferred over splitting by type
    nutrition/      # food logging, daily totals, targets
      components/
      hooks/
      store.ts
    dashboard/      # today's ring, step logging, dynamic-target breakdown
    analytics/      # macro-adherence chart
    gamification/   # streaks, XP/levels, achievements
    bodyMetrics/    # body weight logging + trend
    settings/       # profile, targets, export/import
    auth/           # Supabase auth (login, session)
  db/               # Dexie schema, migrations, seed data
    schema.ts
    index.ts
  lib/              # Pure utilities + cross-cutting services
    sync.ts         # Supabase push/pull sync service
    supabase.ts     # Supabase client + row types
    macroTargets.ts # dynamic activity-driven target math
  data/             # Static seed data (common foods)
  pages/            # Route-level components
  hooks/            # Cross-feature hooks
  types/            # Shared types
public/
  icons/            # PWA icons (192, 512, maskable)
  manifest.webmanifest
```

Keep feature code colocated. A nutrition-specific hook lives in `features/nutrition/hooks`, not in the top-level `hooks/`.

---

## Data Model (Dexie schema)

Defined in `src/db/schema.ts`, currently at **version 9**. When changing this, bump the version number and write a migration (Dexie `.stores({ table: null })` to drop a table) — never silently mutate the schema.

```ts
// Sketches — flesh out in code. Row keys are `uuid` (string) unless noted.

foods:            uuid, name, kcalPerServing, protein, carbs, fat, servingSize, servingUnit, isCustom, isFavorite, ingredients?, notes?
foodLog:          uuid, date, foodId, servings, mealType
bodyMetrics:      uuid, date, weightKg, notes?
dailyActivity:    uuid, date, steps                      // manual step entry per day
userStats:        id=1, xp, level, currentStreak, longestStreak, lastLogDate, streakFreezes
targets:          id=1, dailyKcal, dailyProtein, dailyCarbs, dailyFat
achievements:     uuid, key, unlockedAt, progress
settings:         id=1, heightCm?, sex?, goalType?, dynamicTargetsEnabled?, activityWindowDays?
```

- **Index dates as ISO strings** (`YYYY-MM-DD`) for day-level queries; store timestamps as `number` (`Date.now()`) for precise ordering.
- **Sync fields:** synced rows carry `updatedAt: number` and `syncPending?: boolean`. The singletons (`userStats`, `targets`, `settings`, all `id=1`) follow the same pattern so they can sync last-write-wins.
- Schema versions 1–9 are kept in `schema.ts` as history; v9 drops the removed workout tables (`exercises`, `workouts`, `workoutSets`, `prRecords`, `workoutDrafts`).

---

## Core Features (shipped)

1. **Data layer** — Dexie schema, seed data (~common foods), store wiring, Supabase sync.
2. **App shell** — Bottom-nav layout (**Home / Nutrition / Stats / Settings**), routing, theme, PWA manifest.
3. **Calorie logging** — Add food to a meal (breakfast/lunch/dinner/snack), see daily totals vs target, favorite foods quick-add, custom food creation.
4. **Dashboard** — Today's kcal vs target (ring), macro bars, step logging, current streak, level badge, dynamic-target breakdown.
5. **Body weight + steps** — Log body weight (with trend) and daily steps; steps feed the dynamic targets.

---

## Gamification Layer

1. **Streaks** — A day counts as "logged" when food is logged that day. Show current + longest. Auto-grant 1 streak freeze per ISO week (max 2 banked); freezes are consumed automatically on missed days before the streak breaks. (`lib/streak.ts`.)

2. **XP & Levels** — XP sources: hitting daily kcal target within ±10% (+30), hitting protein target (+20), weekly recap viewed (+25, currently unused). Level curve: `xpForLevel(n) = 100 * n^1.5`. Display level + progress bar on dashboard. Constants in `lib/xp.ts`.

3. **Achievements** — Defined declaratively in `features/gamification/achievements.ts` and evaluated in `lib/achievementEval.ts` after relevant log events; unlocks trigger a toast + persistent entry. Current set rewards consistency/progress only: streak (7/30-day), level (5/10), first food log, protein-goal streak, first weight log.

4. **Progress charts** — Macro adherence (stacked kcal by macro vs. target, week/month) on the Analytics page; body-weight trend on the Stats page.

### Dynamic activity-driven targets

The headline nutrition feature (`lib/macroTargets.ts`, `features/dashboard/hooks/useDynamicTargets.ts`). When `settings.dynamicTargetsEnabled` is on, the daily kcal/macro target is the baseline plus an **activity bonus** derived from steps:

- Bonus per day ≈ `steps × bodyWeightKg × KCAL_PER_STEP_PER_KG`, averaged over a rolling window (`settings.activityWindowDays`, 3/5/7 — quiet days drag it down).
- The extra kcal is distributed to **carbs and fat** in the baseline ratio; **protein stays fixed** at the user's set target.
- The same dynamic target must be used everywhere it's shown (dashboard, nutrition tab, analytics) — compute it through `useDynamicTargets`/`computeDynamicTargets`, don't read the raw baseline.

> **Removed:** workout XP, PR detection, and per-exercise 1RM/volume charts went away with the workout feature. Weekly recap is specced but not implemented.

---

## Coding Conventions

**TypeScript**
- Strict mode on. No `any` — use `unknown` and narrow, or define the type properly.
- Prefer `type` for unions/intersections, `interface` only when extension is expected.
- Export types alongside implementations from feature modules.

**React**
- Function components only. No class components.
- Hooks live with the feature they belong to.
- Keep components under ~150 lines; extract subcomponents or hooks past that.
- Side effects belong in hooks, not inline in JSX or render bodies.

**State**
- Persistent data (foods, logs, body metrics, activity) flows through Dexie via custom hooks (`useDailyLog`, `useBodyMetrics`, `useTargets`, etc.) backed by `dexie-react-hooks` `useLiveQuery`.
- UI / ephemeral state stays in Zustand or local `useState`.
- Don't duplicate Dexie data into Zustand. Zustand holds UI mode, current selections, derived gamification state.
- Writes that should sync set `updatedAt`/`syncPending` and trigger `syncService.sync(userId)` — see `features/nutrition/hooks/useTargets.ts` and `features/settings/hooks/useSettings.ts` for the pattern.

**Styling**
- Tailwind utility classes. No CSS modules, no inline styles unless dynamic.
- Use shadcn/ui components instead of building from scratch.
- Dark mode is the default; light mode is optional and lower priority.
- Mobile-first: design for ~390px wide first, add `md:` breakpoints only where it meaningfully helps on tablet/desktop.

**Naming**
- Components: `PascalCase.tsx`
- Hooks: `useThing.ts`
- Utilities: `camelCase.ts`
- Constants files: `kebab-case.ts`

**Imports**
- Use `@/` alias for `src/` (configure in vite + tsconfig).
- No deep relative paths (`../../../`). Refactor instead.

---

## Sync (Supabase)

- **Offline-first:** Dexie is the source of truth on-device; the app is fully usable with no network and no Supabase config.
- When Supabase env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are set, the user signs in and `lib/sync.ts` (`syncService`) does a per-user **push/pull** on a `user_id` scope. Conflict resolution is **last-write-wins on `updatedAt`**. Tables sync as bulk rows (collections) or singletons (`targets`, `user_stats`, `settings`).
- Row/table types for Supabase live in `lib/supabase.ts`. Keep the Dexie schema, the sync table list, and these types in agreement when adding/removing tables.
- **Known gap:** the `settings` table sync expects a matching Supabase table that **still needs to be created** (mirror `targets`/`user_stats`: `user_id` PK + the columns + `"updatedAt"`). Until it exists, settings push/pull no-ops safely.

---

## PWA Requirements

- App must be fully functional offline after first load.
- No network calls except: optional Open Food Facts lookups, and the optional Supabase sync the user opts into by signing in.
- Manifest: standalone display, portrait orientation, themed status bar.
- Icons: 192×192, 512×512, plus a maskable 512×512.
- Service worker via Workbox (`src/sw.ts`), precaching the app shell + an Open Food Facts runtime cache.
- Provide a manual "Export data" (JSON download) and "Import data" in Settings as a backup path independent of cloud sync.

---

## What NOT to Do

- Single-user Supabase auth + personal cloud sync are allowed (approved deviation). Don't add **multi-user, sharing, or social** features, and don't add a second backend/auth system.
- Don't add ads, analytics, telemetry, or third-party trackers.
- Don't reintroduce workout/exercise/PR tracking, or add gym/strength features, unless explicitly asked.
- Don't add features designed to make the user feel bad for missing days (no guilt mechanics, no aggressive notifications, no "shame" UI).
- Don't add aggressive calorie restriction features, weight-loss-focused defaults, or before/after framing — keep nutrition tracking neutral.
- Don't recommend specific calorie or macro targets in code. The user sets their own targets in Settings.
- Don't add achievements tied to extreme restriction (e.g. "ate under 1000 kcal" type things). Achievements should reward consistency and progress, not deprivation.
- Don't refactor wide swaths of the codebase without being asked — make surgical changes.
- Don't add dependencies without flagging them first.

---

## Working With the Owner

- This is a personal project — favor speed and iteration over polish for unused features.
- When making non-trivial decisions, briefly explain the tradeoff in the PR/commit message or response, but don't ask permission for every small thing.
- If a request is ambiguous, make a reasonable assumption, state it, and proceed.
- If something in this file conflicts with a direct request from the owner, the owner wins — but call out the conflict so they can update this file if needed.
- Prefer adding TODO comments over leaving features half-implemented in committed code.

---

## Build & Run

```bash
npm install
npm run dev        # Vite dev server
npm run build      # Production build
npm run preview    # Test built PWA locally
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint
```

To install on Android: open the dev/preview URL in Chrome on the phone (use local network IP or deploy to e.g. Netlify/Vercel for HTTPS), then "Add to Home Screen." Service worker requires HTTPS or localhost.

---

## Current Status

**Phase:** Live — MVP + gamification shipped.
**Working:** calorie/macro logging, dashboard with macro ring + step logging, body weight logging + trend, dynamic activity-driven targets, macro-adherence analytics, streaks/XP/levels/achievements, export/import, and optional Supabase auth + sync. Bottom nav is **Home / Nutrition / Stats / Settings**.
**Removed:** the workout/exercise/PR feature (see History in Project Overview).
**Next step:** create the Supabase `settings` table so settings sync across devices.
**Future ideas (not started):** adaptive TDEE (estimate maintenance kcal from weight trend vs. intake), bodyweight goals + projection, faster food logging (templates / "copy yesterday" / barcode).

Update this section as the project progresses.
