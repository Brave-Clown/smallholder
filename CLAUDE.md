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
- Components use **named exports**. `src/App.tsx` is the only component with a
  default export (`src/lib/i18n.ts` also default-exports, as an instance).
- Routes are lazy-loaded through the `lazyRetry()` wrapper, which recovers from
  a stale PWA cache serving a deleted chunk. New routes must use it too.
- i18n: default locale is `en`, and a returning user's stored choice beats
  browser detection; strings load over HTTP from `public/locales/{lng}/`, so a
  new key needs the file, not just the code.
- **Persisted state has no version and no migrations, deliberately.** Until
  real data exists — a self-hosted instance someone actually gardens with, not
  the dev environment or the demo page — a schema change is free: change the
  shape, bump `STORAGE_KEY`, start clean. Do not add compat shims for stored
  data. This ends when real use starts, and then version + migrate come back.
  The key lives in `src/lib/locale.ts` as `STORAGE_KEY`; that file and
  `src/lib/theme.ts` both read it at module load, before the store hydrates,
  so anything that must run earlier than hydration belongs in one of those two.
- Exports are written with `app: "smallholder"`; imports also accept the legacy
  `"gardener"` id so pre-fork backups keep working. Constants live in
  `src/lib/dataExport.ts`.

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
- A roadmap claim marked "verified" must cite what was actually read —
  `file.ts:line`, a count, a formula — so the next session can re-check it
  in seconds instead of trusting it. Unciteable claims have already gone
  wrong twice: per-bed `notes` was recorded as existing when only
  `CellPlanting.notes` did, and "manual placement ignores spacing" was
  recorded when it warns at `placementValidation.ts:79`. Re-verify before
  building on any claim, however confident it sounds.

## Plant Data Rules

- Data = compiled horticultural facts, authored for this project.
  **Never bulk-import datasets licensed NC or SA** (incompatible with MIT).
  Decided sources are tabled below.
- `dataQuality` ("verified" | "draft" | "community") and `source` are a **v2
  requirement, not the current state**: they exist only on `PlantV2`
  (`src/types/plantV2.ts:171`), and 0 of the 45 shipped plants carry either —
  `src/types/plant.ts` doesn't declare them. They land with the Level 2 schema
  migration, and from then on every plant carries both, with new batches
  entering as "draft" until human-reviewed. Values taken from the OpenFarm
  rescue enter as **"community"** — its own maintainer calls it "a useful
  scaffold, not an authority" — and only become "verified" once a human has
  actually checked them. Nobody hand-authors 300 plants; they review flagged ones.
- Seed climate data reference: climate-needs data must stay consistent
  with the ClimateNeeds semantics in src/types/plantV2.ts (germination
  floor AND ceiling, frost tolerance class, growth band, heat ceiling,
  photoperiod, vernalization, perennial winter-kill + chill hours).

### Decided sources (2026-07-28) — licences read from primary sources, not search summaries

| Field | Source | Licence |
|---|---|---|
| `family`, `scientificName` | Wikidata | CC0 |
| `lifecycle`, `habit` | USDA PLANTS — "Duration" and "Growth Habit" are first-class fields | US public domain |
| `nutritionPer100g` | USDA FoodData Central | US public domain |
| `rootDepthCm` | USDA NRCS irrigation guides (National Engineering Handbook part 652), effective root-zone depth tables | US public domain |
| `spacing`, days to maturity, sun, companions | `github.com/thefullnacho/openfarm-crops-rescue` — 340 crops as JSON, recovered from the Wayback Machine after OpenFarm.cc shut down in April 2025 | **CC0** |

**Do not import from** Permapeople (CC BY-SA 4.0, verified in its own database
FAQ), Plants For A Future, Practical Plants, or Wikipedia. ShareAlike would
relicense this repo. Permapeople was seeded from a PFAF dump, so that whole
lineage is out. FAO-56 Table 22 has the best rooting-depth data, but FAO's
catalogue is largely NC-SA and the USDA NRCS tables say the same thing with no
licence argument — use those.

**Licences govern expression, not facts.** Reading a Permapeople or extension-
service page to check one value and recording that value is research and is
fine; copying their dataset is not. That distinction is what makes "authored for
this project" honest rather than a fig leaf. Keep it that way, and record where
each value came from in `source`.

**The bottleneck is `ClimateNeeds`, and it will stay authored.** No open dataset
carries germination floor *and* ceiling, frost-tolerance class, heat ceiling,
photoperiod and vernalization together, because that shape is this project's own
idea. `docs/design/climate-needs-45.json` covers batch 1; every batch after it is
rate-limited by this, not by the mechanical fields — which is what makes the
draft → verified pipeline the central mechanism rather than bookkeeping.

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
