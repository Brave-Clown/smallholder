<h1 align="center">Smallholder</h1>

<p align="center">
  <strong>A garden planner that grows into a homestead manager.</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/status-early%20fork-orange" alt="Status: early fork">
  <img src="https://img.shields.io/badge/i18n-DE%20%7C%20EN%20%7C%20ES%20%7C%20FR-blue" alt="4 languages">
</p>

<p align="center">
  <a href="https://brave-clown.github.io/smallholder/"><strong>Live demo</strong></a>
  &nbsp;&middot;&nbsp;
  <a href="ROADMAP.md">Roadmap</a>
  &nbsp;&middot;&nbsp;
  <a href="#status-early-fork-not-ready-for-real-use">Status</a>
</p>

---

## What this is

Most garden planners assume you already know what you are doing. Smallholder is
aimed at the opposite person: a total layperson who wants to grow a meaningful
share of their own food and has no idea where to start. It begins at "what do I
plant this week" and scales, only if you ask it to, toward whole-property food
production — beds, livestock, pantry, compost, water.

The governing rule is progressive disclosure. Every capability has to be
ignorable, so someone who only wants a planting date never meets the rest.

## Status: early fork, not ready for real use

Being blunt, because the badge above is doing real work:

- This is a hard fork of **[mniedermaier/gardener](https://github.com/mniedermaier/gardener)**
  and most of the code here is still his. It builds, runs, and passes its tests
  (113 unit tests across 17 files).
- **The part that makes it Smallholder is not written yet.** Upstream derives
  planting dates from frost-date offsets. Smallholder computes planting windows
  from climate normals × per-plant climate needs, and can explain *why* a window
  closes — frost, heat, soil temperature, vernalization, daylight. That engine
  is Level 3 on the roadmap. The schema it consumes exists
  (`src/types/plantV2.ts`); the engine does not.
- **Adopting mid-season is currently broken.** Task dates all derive from the
  last frost date and ignore when you actually planted, so a mid-season start
  produces a task list full of past-dated work. That is the top Level 2 item.
- There is a **[live demo](https://brave-clown.github.io/smallholder/)**, but it
  auto-deploys from `main`, so it shows the fork exactly as it is — including
  everything above. The screenshots in `docs/` are inherited from upstream and
  still show the old branding.

If you want a garden planner that works today, use
[upstream](https://github.com/mniedermaier/gardener) — it is further along and
maintained. Come back here once Level 2 lands.

## What works today

Inherited from upstream and functional: drag-and-drop bed planner with companion
and rotation validation, 45 plants, task calendar, harvest log, garden journal,
seed inventory, soil tests, pest tracker, livestock and feed tracking,
preservation and pantry, expense tracking, weather dashboard, self-sufficiency
calculator, full JSON backup and CSV export. Works offline as a PWA, in four
languages.

Treat all of it as inherited ground being rebuilt, not as a finished product.

## Quick start

```bash
git clone https://github.com/Brave-Clown/smallholder.git
cd smallholder && npm install && npm run dev
```

Docker, with the optional sync backend:

```bash
docker compose up --build    # http://localhost:8080
```

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (localhost:5173) |
| `npm run build` | TypeScript check + production build |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:e2e` | E2E tests (Playwright) |

## Direction

- **[ROADMAP.md](ROADMAP.md)** — levels, not dates. Start there.
- **[CLAUDE.md](CLAUDE.md)** — architecture invariants and conventions.
- **[src/types/plantV2.ts](src/types/plantV2.ts)** — the v2 schema and the
  reasoning behind it.

React 19 · Vite 8 · TypeScript 6 · Tailwind 4 · Zustand · @dnd-kit ·
react-i18next · date-fns · SunCalc · Vitest · Playwright · PWA (Workbox).
Optional backend: Express 5 + SQLite.

## Data safety

All data stays in your browser. No account, nothing sent anywhere. Full JSON
backup and CSV export are built in, and backups produced by upstream Gardener
still import.

## Contributing

Too early. The foundations are still moving and I would be wasting your time.
Issues describing real growing problems are welcome; see
[CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE). Original work © Matthias Niedermaier; fork modifications
© Brave Clown. Upstream's copyright notice is retained as MIT requires.
