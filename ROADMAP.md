# Roadmap

Levels, not dates. **0** = Make Repo ours · **1** = fix what exists · **2** = minimum for real daily use · **3** = near-term (each ≈ days to 2 weeks of mixed daily work) · **4** = north star (homestead → small-town scale, 2–4 decade horizon). New ideas land in the Inbox until a sorting pass — never straight into a level.

## Level 0 — Make the repo ours (identity + tooling, before any app work)

- [x] Baseline savepoint: fresh clone → `npm install`, `npm run dev`, `npm run build`, `npm run test` all pass; log any upstream breakage, don't fix it here — *all four pass, 112 tests, no breakage found*
- [x] Claude Code installed, authenticated, opened at the repo root, reading CLAUDE.md (human setup, not a handoff)
- [x] Governing docs land in-repo: CLAUDE.md + ROADMAP.md at root; plant-schema-v2.ts → `src/types/plantV2.ts`; climate-needs-45.json staged under `docs/design/` for Level 2; stub `docs/design/climate-engine.md` or fix the CLAUDE.md pointer. From here the repo is canonical; Project uploads become stale mirrors. — *pointer now aims at plantV2.ts; climate-engine.md deferred to Level 3*
- [x] Identity sweep: gardener → smallholder in `package.json`, README, `index.html` title, PWA manifest name/short_name (the install prompt shows these), GitHub About/description/topics — *`gardener-storage` deliberately left alone; folded into the Level 2 schema-v2 migration. Also removed the inherited Buy-Me-A-Coffee block, which pointed at upstream's account*
- [x] License hygiene: retain upstream's MIT copyright notice, add mine alongside for the fork's changes
- [x] README rewrite: the thesis in one paragraph, honest early-fork status, pointer to ROADMAP.md — short, nobody is reading it yet — *status section needs revisiting once Level 2 lands; it currently tells people to use upstream instead*
- [x] Upstream residue: inspect `.github/` (workflows, FUNDING.yml, templates) and any netlify/vercel/deploy configs; delete or retarget — *no FUNDING.yml or netlify/vercel existed; fixed `--base=/gardener/` in deploy.yml (would have 404'd every Pages asset) and a blank-issue link pointing at `niedermm/gardener`*
- [x] *(optional)* GitHub Pages auto-deploy of `main` — standing demo URL that doubles as the acceptance-check surface for every handoff — *live at https://brave-clown.github.io/smallholder/ ; the deploy gates on `tsc -b` + the unit suite, so a red build never reaches the demo*

## Level 1 — Make the current app right

- [ ] Default language becomes English (inherited from upstream, who is German). German stays a first-class locale, it just stops being the default. Set in **two** places that must agree: `getStoredLocale()` in `src/lib/i18n.ts` and `locale:` in the settings slice initial state; also `<html lang>` and the `og:locale` / alternates in `index.html`. Note the onboarding wizard already has a language picker, so this governs which language the wizard itself speaks before the user chooses. Better option than hardcoding: `i18next-browser-languagedetector` is already a dependency and is never imported — wire it up to detect the browser locale with English as fallback, so a German visitor still lands in German. If we hardcode instead, drop the unused dependency
- [ ] Today marker on the calendar/timeline (verified: none exists)
- [ ] Guild templates fill the whole bed — tile/scale the pattern instead of a fixed 3×3; make the guild button a friendly front door to the auto-fill engine rather than a parallel tool
- [ ] Auto-fill consults the companion validator *while scoring*, so it stops generating conflicts it flags a second later
- [ ] Downgrade companion conflicts everywhere to soft warnings with per-placement override
- [ ] Surface the per-bed `notes` field in the bed UI (verified: exists in the data model and exports; the UI just barely exposes it)
- [ ] Show plant spacing prominently at placement time (info panel already displays spacingCm; auto-fill already respects it; manual placement doesn't)
- [ ] Wire up or remove decorative fields: raised-bed height → soil volume calculator; document what environment types actually do (they are NOT fluff — they shift effective frost dates and drive container/sun checks)
- [ ] Grid cell size becomes a per-bed property instead of a global setting

## Level 2 — Minimum for daily real use (mid-season, real garden)

- [ ] **Mid-season onboarding.** Task generation must anchor to each planting's actual `plantedDate`, emit only future tasks, and mark implied-past steps done. (Verified root cause: all task dates derive from `lastFrostDate`; `plantedDate` is ignored — hence the past-dated task list.) Most real users adopt tools mid-season; this is the adoption showstopper.
- [ ] Dual frost dates (spring + fall) with risk percentiles, frost-free toggle, manual ClimateProfile entry
- [ ] Per-bed sun exposure field, wired into placement validation and auto-fill scoring
- [ ] Schema v2 migration: lifecycle split, required ClimateNeeds, family on the plant, frost offsets deleted
- [ ] Crop expansion batch 1 (~50 homestead/SoCal staples: sweet potato, okra, melons, winged bean, first fruit trees)
- [ ] Task list filterable by garden/bed selection
- [ ] README status rewrite: once mid-season onboarding works, drop the "use upstream instead" steer and the early-fork badge, and re-describe what actually ships

## Level 3 — Near-term

- [ ] Window engine: ERA5 fetch → weekly normals + frost percentiles → computed PlantingWindows with risk levels and `limitedBy` reasons
- [ ] Rotation memory: read season archives, warn on same-family repeats per bed across years
- [ ] Sites above gardens (site → garden → bed)
- [ ] **Fields as a row-based abstraction** — crop, row length, row count, row spacing — not giant cell grids (a 100 m × 100 m bed at 30 cm cells ≈ 111,000 DOM nodes; rows are also how field-scale agriculture actually thinks)
- [ ] Auto harvest + pick-window tasks (beans: "pick every 2–3 days" once bearing)
- [ ] Nursery/propagation bed purpose + propagation methods (seed / cutting / division / sets / tuber / crown)
- [ ] Imperial display units (storage stays metric, conversion at the boundary)
- [ ] Granular export/import and sharing at bed and site level (notes included)
- [ ] Chinese (zh) locale
- [ ] Crop batches 2+ toward hundreds (draft → verified review pipeline)
- [ ] Succession presets move from hardcoded tables into plant data

## Level 4 — North star

- [ ] Water: irrigation estimates from ET₀ × crop coefficient (needs sun model + weather pipeline); rain-aware task skipping via forecast; storage/distribution planning (tank sizing from roof area × rainfall normals)
- [ ] Workers: assignable tasks, per-person daily sheets, selection-scoped lists at town scale
- [ ] Multi-site coordination and aggregate sufficiency rollups (bed → site → town)
- [ ] Time scrubbing: view the plan as of any date, forward and back
- [ ] Preservation planner deepening: canning/curing/smoking timing tied to predicted harvest volumes
- [ ] Ornamental & pollinator beds (aesthetics + beneficial insect habitat)
- [ ] Climate drift: periodic re-derivation of climate normals (the ERA5 rolling-window design already supports this)
- [ ] Local AI integration for Q&A/planning over the homestead data
- [ ] Community crop packs; CONTRIBUTING.md with AI-use policy
- [ ] Public demo site; revisit hosted offering (donations first — hosting means real data-custody obligations)

## Inbox (capture-only, sort later)

- (empty)
