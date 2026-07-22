# CLAUDE.md

## Project

A self-sufficiency planning app (fork of mniedermaier/gardener, diverging hard).
Working thesis: take a total layperson as close to food self-sufficiency as
software can. Long horizon: garden → full homestead planning (livestock,
pantry, compost, water).

**Product principle — progressive disclosure.** Simple by default, homestead-
complex by choice. Every new capability must be ignorable: a user who only
wants "what do I plant this week" never sees the rest. If a feature can't be
ignored, redesign it.

## Tech Stack

- React 19 + Vite 8 + TypeScript 6 (strict) + Tailwind 4
- Zustand slices (14) + localStorage persistence; HashRouter
- react-i18next (de/en/es/fr), @dnd-kit, date-fns, SunCalc
- PWA via vite-plugin-pwa; optional Docker backend (Express 5 + better-sqlite3
  + Zod — note the backend is pinned to TypeScript 5.8, not 6)

Tailwind 4 is CSS-first: theme tokens live in `@theme` in `src/index.css`.
There is no `tailwind.config.js` and there should not be one.

## Commands

```bash
npm run dev          # Vite dev server, localhost:5173
npm run build        # tsc -b && vite build
npm run test         # Vitest unit tests
npm run test:watch
npm run test:e2e     # Playwright (e2e/playwright.config.ts)
docker compose up --build   # full stack, localhost:8080
```

## Codebase Map (inherited from upstream — verified, not assumed)

- `@/` is an alias for `src/`.
- State: 14 slices in `src/store/`, composed in `src/store/index.ts`
  (`seasonArchives` lives in index.ts, not its own slice).
- **Always read state with `useShallow()` selectors — never bare `useStore()`.**
  This is load-bearing for render performance, not style.
- Components use **named exports**. `src/App.tsx` holds the only default export.
- Routes are lazy-loaded through the `lazyRetry()` wrapper, which recovers from
  a stale PWA cache serving a deleted chunk. New routes must use it too.
- i18n: default locale is `de`, fallback `en`; strings load over HTTP from
  `public/locales/{lng}/`, so a new key needs the file, not just the code.
- The persisted localStorage key is `gardener-storage`. Renaming it during the
  identity sweep discards existing user data — it needs a migration.

## Architecture Direction (v2 — non-negotiable invariants)

1. **Planting windows are COMPUTED, never authored.** The climate engine
   derives windows from ClimateProfile (weekly temp normals + frost
   percentiles, ERA5-derived or manual) × per-plant ClimateNeeds. Never add
   regional calendar tables, zone lookup charts, or hardcoded dates.
2. **Frost offsets are dead.** Never reintroduce sowIndoorsWeeks-style
   fields relative to a frost date. If old code references them, that code
   is migration debt — remove it.
3. **ClimateNeeds is required on every plant.** A plant without a climate
   contract cannot ship. Schema: src/types/plantV2.ts.
4. **Lifecycle is a real split.** Annuals and perennials have different
   maturity/yield shapes. No harvestDays >= 365 hacks.
5. **Engine limits are teaching moments.** Every window carries `limitedBy`;
   the UI must be able to say WHY a window closes (frost / heat /
   soil temp / vernalization / daylight).

## Conventions

- Storage is metric, always. Imperial exists only at the display/input
  boundary (same pattern as i18n). Never store feet or °F.
- Business logic lives in src/lib/ as pure functions with Vitest coverage;
  components stay thin.
- New state = new Zustand slice following the existing slice pattern.
- User-facing strings go through i18n keys (en required; other locales may
  lag with fallback).
- New plants: emoji icon is the default; custom SVG is optional, never
  required.

## Plant Data Rules

- Data = compiled horticultural facts, authored for this project.
  **Never bulk-import datasets licensed NC or SA** (incompatible with MIT).
  Public domain / CC0 sources are fine (USDA FoodData Central for
  nutrition, Wikidata for taxonomy).
- Every plant carries `dataQuality` ("verified" | "draft" | "community")
  and `source`. New batches enter as "draft" until human-reviewed.
- Seed climate data reference: climate-needs data must stay consistent
  with the ClimateNeeds semantics in src/types/plantV2.ts (germination
  floor AND ceiling, frost tolerance class, growth band, heat ceiling,
  photoperiod, vernalization, perennial winter-kill + chill hours).

## Don'ts

- Don't preserve upstream compatibility; this fork breaks freely.
- Don't put plant knowledge in components — it belongs in data + lib.
- Don't add features that can't be ignored (see product principle).
- Don't create excessive comments or restate what code already says.

## Pointers (read ad hoc, not imported)

- Roadmap: ROADMAP.md + GitHub milestones/issues
- v2 schema rationale: src/types/plantV2.ts (header + inline comments).
  A separate docs/design/climate-engine.md gets written at Level 3, when the
  engine itself is designed — not before, or it just restates the schema.
