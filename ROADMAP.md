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

- [x] Default language becomes English (inherited from upstream, who is German) — *done via `i18next-browser-languagedetector`, which was already a dependency and imported nowhere. Precedence is stored choice → browser language → English, so a German visitor still lands in German. New `src/lib/locale.ts` owns the supported list, the default, and the persist key, which also collapsed four hardcoded copies of `gardener-storage` into one*
- [x] Today marker on the calendar/timeline (verified: none exists) — *vertical line per row on the season timeline plus a diamond cap in the month header, alongside the existing frost line. The axis math moved out of the component into `src/lib/timeline.ts` with tests, which also fixed a real bug: `monthFraction` divided every month by 31 days, so short months compressed and every bar after February sat slightly late*
- [x] Guild templates fill the whole bed — tile/scale the pattern instead of a fixed 3×3; make the guild button a friendly front door to the auto-fill engine rather than a parallel tool — *tiles rather than scales: guild offsets encode a real planting distance (a Three Sisters mound is a mound, not a ratio), so stretching one would destroy the spacing it exists to express. Partial edge tiles clip and path cells stay empty. The standalone chip row under the grid is gone; guilds are now the first section of the wand popover, above direction and strategy, so the named front door and the goal-driven engine are one control. New `src/lib/guildFill.ts` with tests; pattern extent is derived from the offsets so it can't drift from `minWidth`/`minHeight`. Merging the two tools exposed that strategy fill planted straight through paths — `recommendBedPlanting` never consulted `bed.paths`, so plants were buried under path tiles that render over them, invisible but live in stats, exports and task generation. Fixed at the end of `recommendBedPlanting` rather than inside all four placement functions, so no direction can regress; covered by a test over all 24 direction × strategy pairs. Both fills now write through one `applyFill` in the planner: a new `setBedCells` store action lands the whole bed in a single update instead of one `setCell` per cell (~95 for a 12×8), and undo restores the previous cell array. That surfaced a pre-existing bug in `useUndo`, which ran the undo action inside a `setStack` updater — React calls updaters during the render phase, so every undo wrote to the store mid-render; the stack is now mirrored in a ref so the Ctrl+Z listener still sees fresh state without the side effect*
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
- [ ] **Sanity-check each auto-fill strategy against its own goal.** Nothing currently asserts that `selfsufficient` actually produces better nutritional coverage than `balanced`, or that `calories` beats the others on calories — the strategies are named promises with no measurement behind them. `calculateSufficiency` already returns per-nutrient `{produced, needed, percent}`, so it is the oracle: fill a bed with each strategy, score the result, assert each one wins on the metric it claims. Land this *before* crop batch 1, so the batch is measured against a known baseline instead of silently moving one.
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
- [ ] **Rescore auto-fill for a growing plant corpus** (follows the Level 2 sanity-check). Two structural problems, both harmless at 45 plants and neither harmless at 300: (1) `scorePlant` grades every plant independently and takes the top N, but "self-sufficient" is a property of the *set* — six high-protein legumes each score well and leave the plan with no vitamin C. A coverage goal needs portfolio selection, not per-plant ranking. (2) The nutrition thresholds are absolute (`protein > 2`, `calories > 30`, `vitC > 20`) and today split the corpus 16/25/22 of 45; nothing rescales them as plants land, so the signal flattens toward "everything qualifies". Also `?? 0` scores missing nutrition as zero, so sparse `draft` entries rank bottom for reasons unrelated to their merit.
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

- Auto-fill caps species variety at a fixed 6 (4 for `calories`/`yield`) however large the bed: `Math.min(6, Math.ceil(totalCells / 3))` in `recommendBedPlanting`. The low end does scale — a 6-cell bed gets 2 species — but the top end never moves, so a 96-cell bed and a 400-cell bed both get 6. Not obviously a bug: fewer types is the deliberate point of `calories`/`yield`, and monoculture blocks are legitimate at field scale. Wants sorting alongside the Level 3 rescoring and the fields abstraction rather than a blind raise.
