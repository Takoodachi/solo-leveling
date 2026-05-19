# CLAUDE.md

This file gives AI assistants the context needed to work productively on this project. Read it before making changes.

---

## Project Overview

**Name:** Solo Leveling
**Type:** Personal fitness tracker — workout logging + calorie tracking with gamification
**Platform:** Progressive Web App (PWA), installable on Android
**Scope:** Single-user, personal use only. No auth, no backend, no multi-user features, no app store deployment planned.

**Core principle:** This is a personal tool, not a product. Optimize for the owner's actual habits over generality. Avoid feature creep. Prefer simple, working code over abstraction.

---

## Tech Stack

- **Framework:** React 18 + Vite
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS + shadcn/ui components
- **State:** Zustand (one store per domain: workouts, nutrition, gamification, settings)
- **Persistence:** Dexie.js (IndexedDB wrapper) — all data lives on-device
- **Charts:** Recharts
- **PWA:** vite-plugin-pwa with Workbox for offline support
- **Routing:** React Router v6
- **Icons:** lucide-react
- **Date utilities:** date-fns (not moment, not dayjs)

**Do not add** Redux, MobX, styled-components, or any backend/auth library. If a feature seems to need a backend, flag it instead of adding one.

---

## Project Structure

```
src/
  app/              # App shell, router, providers
  components/       # Reusable UI (PascalCase)
    ui/             # shadcn primitives
  features/         # Feature modules — preferred over splitting by type
    workouts/
      components/
      hooks/
      store.ts
      types.ts
    nutrition/
    gamification/
    dashboard/
    settings/
  db/               # Dexie schema, migrations, seed data
    schema.ts
    index.ts
  lib/              # Pure utilities (date helpers, formatters, calculators)
  data/             # Static JSON (exercise library, common foods)
  pages/            # Route-level components
  hooks/            # Cross-feature hooks
  types/            # Shared types
public/
  icons/            # PWA icons (192, 512, maskable)
  manifest.webmanifest
```

Keep feature code colocated. A workout-specific hook lives in `features/workouts/hooks`, not in the top-level `hooks/`.

---

## Data Model (Dexie schema)

Defined in `src/db/schema.ts`. When changing this, bump the version number and write a migration — never silently mutate the schema.

```ts
// Sketches — flesh out in code

exercises:        ++id, name, category, defaultUnit, isCustom
workouts:         ++id, date, notes, durationMin
workoutSets:      ++id, workoutId, exerciseId, setIndex, reps, weight, duration, rpe
foods:            ++id, name, kcalPerServing, protein, carbs, fat, servingSize, servingUnit, isCustom, isFavorite
foodLog:          ++id, date, foodId, servings, mealType
bodyMetrics:      ++id, date, weightKg, notes
userStats:        id=1, xp, level, currentStreak, longestStreak, lastLogDate, streakFreezes
targets:          id=1, dailyKcal, dailyProtein, dailyCarbs, dailyFat
achievements:     ++id, key, unlockedAt, progress
prRecords:        ++id, exerciseId, metric, value, achievedAt
```

**Index dates as ISO strings** (`YYYY-MM-DD`) for day-level queries, store timestamps as `number` (Date.now()) for precise ordering.

---

## Core Features (MVP — build these first, in this order)

1. **Data layer** — Dexie schema, seed data (exercise library, ~30 common foods), basic store wiring.
2. **App shell** — Bottom-nav layout (Dashboard / Workouts / Nutrition / Stats / Settings), routing, theme, PWA manifest.
3. **Workout logging** — Create workout, add sets per exercise, save. View history per exercise. "Repeat last workout" action.
4. **Calorie logging** — Add food to a meal (breakfast/lunch/dinner/snack), see daily totals vs target, favorite foods quick-add, custom food creation.
5. **Dashboard** — Today's kcal vs target (ring), today's workout summary, current streak, level badge.

Do not start gamification work until the above are functional.

---

## Gamification Layer (Phase 2 — after MVP)

Build in this order, one at a time:

1. **Streaks** — A day counts as "logged" if either a workout or a complete day of food logging happened. Show current + longest. Auto-grant 1 streak freeze per ISO week (max 2 banked); freezes are consumed automatically on missed days before the streak breaks.

2. **XP & Levels** — XP sources: logging a workout (+50), each completed set (+2), hitting daily kcal target within ±10% (+30), hitting protein target (+20), new PR (+100), weekly recap viewed (+25). Level curve: `xpForLevel(n) = 100 * n^1.5` (tune later). Display level + progress bar on dashboard.

3. **Achievements** — Defined declaratively in `features/gamification/achievements.ts` as an array of `{ key, title, description, icon, criteria(state) => boolean }`. Evaluated after every relevant log event. Unlocks trigger a toast + persistent entry.

4. **PR detection** — On workout save, compare each set against historical bests for that exercise (max weight, max reps at given weight, max volume). New best → write to `prRecords`, fire celebration.

5. **Progress charts** — Per-exercise: estimated 1RM over time, volume per session. Nutrition: daily kcal (with target line), macro split, 7-day rolling average. Body weight trend.

6. **Weekly recap** — Generated Sunday night (or on first open after Sunday). Stats: workouts completed, total volume, avg daily kcal, new PRs this week, streak status, achievements unlocked. Stored so it can be reopened later.

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
- Server-ish data (workouts, foods, logs) flows through Dexie via custom hooks (`useWorkouts`, `useDailyLog`, etc.) backed by `dexie-react-hooks` `useLiveQuery`.
- UI / ephemeral state stays in Zustand or local `useState`.
- Don't duplicate Dexie data into Zustand. Zustand holds UI mode, current selections, derived gamification state.

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

## PWA Requirements

- App must be fully functional offline after first load.
- All data stays on-device — no network calls except optional ones the user explicitly opts into (e.g. future Open Food Facts barcode lookup).
- Manifest: standalone display, portrait orientation, themed status bar.
- Icons: 192×192, 512×512, plus a maskable 512×512.
- Service worker via Workbox, precaching the app shell.
- Provide a manual "Export data" (JSON download) and "Import data" in Settings so the owner can back up / move between devices.

---

## What NOT to Do

- Don't add user accounts, sign-in, or social features.
- Don't add a backend, API server, or cloud sync. Local-only.
- Don't add ads, analytics, telemetry, or third-party trackers.
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

**Phase:** Pre-MVP — project not yet scaffolded.
**Next step:** Scaffold Vite + React + TS project, install dependencies, set up Dexie schema and seed data, build app shell with bottom nav.

Update this section as the project progresses.
