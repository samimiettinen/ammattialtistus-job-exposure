# Ammattialtistus

Finnish public-interest visualizer of **theoretical AI exposure**, **current AI adoption**, and **labour-market outlook** for [Ammattiluokitus 2010](https://stat.fi/en/luokitukset/ammatti/ammatti_1_20100101) occupations.

**AI-altistus ei tarkoita työpaikkojen katoamista.**

This is an original product. It follows the *idea* of occupation-level AI exposure maps, not the branding, copy, or assets of any other site.

## What is official vs not

| Field | Official? | Source |
|---|---|---|
| Names, codes, descriptions | Yes | Statistics Finland classifications API `ammatti_1_20100101`, retrieved 2026-08-29 |
| Employed persons | Yes | StatFin PxWeb table **115r**, year **2023**, retrieved 2026-08-29 |
| Outlook / shortage–surplus | Derived from official regional rows | Työvoimabarometri public JSON, period **2026-06**. National figure is an employment-weighted composite, **not** a KEHA national index |
| AI exposure and adoption scores | No | Offline rubric scorer or a small labelled fixture set |

Unscored occupations stay unscored. Missing employment or outlook is shown as unavailable. Employment year 2023 is marked stale in 2026.

Full endpoint log and field mapping: [`docs/SOURCE_DATA_MAPPING.md`](docs/SOURCE_DATA_MAPPING.md). Plan: [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md). Latest audit: [`docs/PHASE_ABCF_AUDIT.md`](docs/PHASE_ABCF_AUDIT.md).

## Setup

```bash
npm install
npm run pipeline:01
npm run pipeline:02
npm run pipeline:03   # ~420 polite requests to Työvoimabarometri
npm run pipeline:04   # fixtures if no API key; LLM if OPENAI_API_KEY is set
npm run pipeline:05
npm run pipeline:06
npm test
npm run dev
```

Open http://localhost:3000 (redirects to `/fi`).

Always start `npm run dev` from **this** directory. Kill any leftover `next` process first. `next.config.ts` pins `turbopack.root` here so a parent `package-lock.json` (for example under `~/Dev`) cannot make Turbopack watch the whole tree.

Copy `.env.example` to `.env.local` only if you want to run the offline LLM scorer. The UI never reads those keys.

## Pipeline

| Script | Role |
|---|---|
| `scripts/01_fetch_finnish_occupations.ts` | AML 2010 FI/SV/EN from `data.stat.fi` |
| `scripts/02_fetch_employment_counts.ts` | POST StatFin `115r.px` json-stat2 |
| `scripts/03_fetch_labor_market_outlook.ts` | Barometer `/api/ammatit` + `/api/Tyollisyys/kohtaanto/Ammatti/{id}/{period}` |
| `scripts/04_score_occupations.ts` | SQLite cache `data/scores.db`, resumable, idempotent |
| `scripts/05_merge.ts` | Writes `data/occupations.json` |
| `scripts/06_validate.ts` | Unique codes, ranges, coverage |
| `scripts/07_validate_curated.ts` | Curated profile integrity and per-profile completeness |

`data/raw/` is gitignored. `data/fixtures/scores.json` is a small committed example set (`scoringModel`: `fixture/2026-08-29`). If the barometer API is down, use `data/fixtures/outlook_adapter.example.json` as a schema template — do not invent official values.

Script `03` also fetches `GET /api/Paikka/regions` so the 19 regional kohtaanto rows carry maakunta names; script `05` persists them as `regionalOutlook[]` on each occupation. The committed `data/occupations.json` was merged before that field existed, so the regional block reads as unavailable until you re-run `npm run pipeline:03 && npm run pipeline:05` on a machine that can reach `tyovoimabarometri.fi`. An unresolved region keeps a null name, and counts the barometer marks as censored stay missing rather than becoming zeros.

## App

- Next.js 16 App Router, Finnish default, Swedish and English
- Treemap (area = employed persons) and scatterplot (exposure × adoption)
- Tabs: Altistus, Käyttöönotto, Työmarkkinanäkymä
- Filter-aware market composition: official outlook mix over the whole view, AI distribution over the scored rows only, with score coverage stated before any mean
- Regional kohtaanto per occupation (19 maakunnat) when the barometer rows have been fetched
- Shareable URL state (`q`, `group`, `outlook`, `emp`, `scores`, `code`, `tab`, `preset`, `compare`)
- `/api/occupations` filters `occupations.json` only — no LLM
- Methodology: `/fi/methodology` — calibration bands, labelled fixtures, provenance, live coverage (fully translated in fi/sv/en)
- Detail panel: grouped task observations led by **what remains human**, plus labelled links to the verified official sources

## Curated golden sets

`data/curated/` holds hand-written task sets for a way of working, spanning several AML codes rather than being one occupation. This is a **third data class** next to official statistics and AI estimates, and it is labelled as such everywhere it appears. Each card carries two independent 1–5 axes — AI assistance and human criticality — each with its own written reasoning, and the AI axis carries its own review date because tool capability ages fastest.

Nothing is validated yet: every card renders as *Kuratoitu luonnos, ei validoitu* until a panel reviews it. `npm run pipeline:07` gates the content. See [`docs/CURATED_GOLDEN_SETS.md`](docs/CURATED_GOLDEN_SETS.md).

## Reading the market composition honestly

The committed catalog scores **24 of 436** visual occupations (**5.5 %**), covering **28.7 %** of employment. The scored subset is not a random sample, so every AI mean in the composition panel sits below a coverage strip that says how much of the market it describes. Official blocks (employment, outlook) cover the whole view and are labelled separately. Cells with no scored occupation render as unavailable, never as zero. There are no salary or wage fields anywhere in this product.

The same rule governs the task lists: **what remains human** counts the tasks an occupation already has, and an occupation with no task list shows the unavailable label rather than a zero share. Source links surface only URLs recorded on the record — no per-occupation deep link is constructed, because none has been verified against the live services.

## Deploy

Any Node host that can run `next build && next start`. Commit `data/occupations.json` so the app boots without re-fetching. Do not commit `.env.local` or `data/scores.db`.
