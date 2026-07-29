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
| `growthRangeC`, `heatCeilingC`, `frostTolerance`, `minWinterTempC`, `photoperiod`; also corroborates `lifecycle`, `habit`, `family`, days to maturity | **FAO ECOCROP** — 2568 species × 55 columns | **CC BY 4.0** — attribution required, no SA, no NC |
| candidate crop list for batches 2+; `heightCm` → `habit` corroboration | `github.com/thefullnacho/openfarm-crops-rescue` — 340 crops as JSON, recovered from the Wayback Machine after OpenFarm.cc shut down in April 2025 | **CC0** |

***The OpenFarm row was corrected 2026-07-28 after actually opening `crops.json`
(340 records, 375 KB).*** *It has exactly 14 keys — slug, name, binomialName,
taxon, description, sun, sowingMethod, spreadCm, rowSpacingCm, heightCm,
companions, source, growingDegreeDays, tags — so it carries **no days to
maturity at all** (the earlier row credited it with that, wrongly; the 57
"matur" hits in the corpus are prose inside `description`). `sun` is 255× "Full
Sun" of 284 present — one value 90% of the time, no signal. `sowingMethod` is
183 distinct free-text strings across 282 records, not a vocabulary. Its
`binomialName` loses to Wikidata anyway: 46 of 305 are malformed, including
genus-only entries, `morning-glory: "Convolvulaceae"` (a family) and
`ferry-morse-contender-bush-bean: "acacia maconochiena"`. What survives is the
crop list itself and `heightCm`.*

**Do not import from** Permapeople (CC BY-SA 4.0, verified in its own database
FAQ), Plants For A Future, Practical Plants, or Wikipedia. ShareAlike would
relicense this repo. Permapeople was seeded from a PFAF dump, so that whole
lineage is out. FAO-56 Table 22 has the best rooting-depth data, but that
document is NC-SA and the USDA NRCS tables say the same thing with no licence
argument — use those. **"FAO is NC-SA" is not true catalogue-wide**, which the
earlier wording implied and which nearly cost us ECOCROP: FAO licenses
per-dataset, and ECOCROP is CC BY 4.0. Read the dataset's own licence, not the
publisher's reputation.

### ECOCROP (added 2026-07-28) — the answer to "where does climate data come from"

*Licence verified from FAO's own catalogue API, not a search summary:
`data.apps.fao.org/catalog/api/3/action/package_show?id=ecocrop` returns
`license_id: "CC-BY-4.0"`. Attribution is required — every value taken from it
carries its `EcoPortCode` in `source`.*

*Measured, 2568 rows × 55 columns: `TOPMN`/`TOPMX` (optimal growth band, 81%
filled) → `growthRangeC`. `TMIN`/`TMAX` (absolute survivable range, 81%) →
`heatCeilingC`. `PHOTO` (67%) is a three-bucket string that maps
1:1 onto our `Photoperiod` union. `LISPA` (89%) is literally
annual/biennial/perennial. `FAMNAME` 93%, `GMIN`/`GMAX` (crop cycle days) 100%.*

***Four `ClimateNeeds` fields are not in it and never will be:***
*`soilGerminationMinC`, `soilGerminationMaxC`, `vernalization`, `chillHoursMin`.
ECOCROP's temperatures are **growth** temperatures — reading `TOPMN` as a
germination floor is the silent-wrong-value failure this file warns about
elsewhere. So the paragraph below still stands, narrowed: the authored core is
those four fields, not all nine.*

***`KTMP` is NOT winter hardiness — corrected 2026-07-28, hours after the
row above was first written wrong.*** *The claim was `KTMP` → `frostTolerance`
**and** perennial `minWinterTempC`. Only the first half is right. ECOCROP
carries **two** killing temperatures, both filled on the same 1157 rows:*

- *`KTMP` — damage during active growth. Clusters between −5 and 0 °C (1012 of
  1157 rows), never below −20. → `frostTolerance`.*
- *`KTMPR` — killing temperature during **rest**. → `minWinterTempC`.*

***Two more ECOCROP columns bite the same way.*** *`GMIN`/`GMAX` is the whole
crop cycle, not days to harvest — it reports an annual figure for perennials and
a to-seed figure for cut-and-come-again herbs, so it corroborates a pick and
must never overwrite `maturity`. And `FAMNAME` is pre-APG: `Cruciferae`,
`Umbelliferae`, `Labiatae`, `Compositae`, `Leguminosae`, `Gramineae`,
`Alliaceae`, `Chenopodiaceae` cover 31 of our 45 plants and match nothing in the
`BotanicalFamily` union, so a lowercase map would drop every brassica to
`"other"` and silently disable rotation warnings. Use `plantFamilyMap`, which
already covers all 45; ECOCROP's families only matter for new plants in later
batches.*

*The tell is a plant whose hardiness you already know: `Picea abies` reads
`KTMP −1, KTMPR −30`, and `Pinus sylvestris` reads `KTMP −1, KTMPR −40`. Norway
spruce does not die at −1 °C. Our own perennials land where they should on
`KTMPR` — raspberry −35, blueberry −29, blackcurrant −28 — and would have been
recorded as dying at −1 °C had the original mapping shipped. **That is the
silent-wrong-value failure this file keeps warning about, caught only by
sanity-checking against a plant whose real hardiness was known.** Neither
column is named in a way that reveals this; the data had to be looked at.*

***The work is the mapping table, not the values.*** *A naive
scientific-name match got 4 of 45 wrong in the first pass: every brassica
collapsed onto `var. botrytis` (cauliflower) when ECOCROP has correct separate
rows for capitata / italica / gongyloides / gemmifera / acephala, and
pumpkin+squash landed on `Cucurbita foetidissima` — buffalo gourd, a wild
inedible. Tomato and leek looked "absent" until searched by synonym
(`Lycopersicon esculentum`, `Allium ampeloprasum`); only 757 of 2568 rows carry
a `SYNO` at all. Also 686 rows have a zero in `GMIN`/`GMAX`. **Every plant needs
its EcoPortCode chosen by a human and the common name checked**, which is the
review job the draft → verified pipeline was designed for.*

**Licences govern expression, not facts.** Reading a Permapeople or extension-
service page to check one value and recording that value is research and is
fine; copying their dataset is not. That distinction is what makes "authored for
this project" honest rather than a fig leaf. Keep it that way, and record where
each value came from in `source`.

**The bottleneck is `ClimateNeeds`, and part of it stays authored.** *Narrowed
2026-07-28 after ECOCROP.* The original claim was that no open dataset carries
this shape at all; that was too strong — ECOCROP supplies the growth band, heat
ceiling, frost-tolerance signal and photoperiod for ~2000 species under CC BY.
What survives the correction is the harder half: **germination floor *and*
ceiling, vernalization, and chill hours are carried by no open dataset**,
because sowing-side thresholds are what a *planner* needs and ECOCROP was built
to answer "will this crop grow here", not "when do I sow it". That gap is the
fork's actual contribution. Batch 1 is authored and lives on the plant record in
`src/data/plantsV2.json` — `climate` per plant, and that is the only copy;
`docs/design/climate-needs-45.json` was its staging file and was deleted once
consumed. `soilGerminationMaxC` is filled on the 34 seed-started plants and
deliberately blank on the 11 grown from sets, tubers, crowns, bare root or
cuttings, which never germinate. Later batches are rate-limited by those four
fields plus the human choice of which ECOCROP row a plant is — which is what
makes the draft → verified pipeline the central mechanism rather than
bookkeeping.

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
