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

Full endpoint log and field mapping: [`docs/SOURCE_DATA_MAPPING.md`](docs/SOURCE_DATA_MAPPING.md). Plan: [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md).

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

`data/raw/` is gitignored. `data/fixtures/scores.json` is a small committed example set (`scoringModel`: `fixture/2026-08-29`). If the barometer API is down, use `data/fixtures/outlook_adapter.example.json` as a schema template — do not invent official values.

## App

- Next.js 16 App Router, Finnish default, Swedish and English
- Treemap (area = employed persons) and scatterplot (exposure × adoption)
- Tabs: Altistus, Käyttöönotto, Työmarkkinanäkymä
- Shareable URL state (`q`, `group`, `outlook`, `emp`, `scores`, `code`, `tab`)
- `/api/occupations` filters `occupations.json` only — no LLM
- Methodology: `/fi/methodology`

## Deploy

Any Node host that can run `next build && next start`. Commit `data/occupations.json` so the app boots without re-fetching. Do not commit `.env.local` or `data/scores.db`.
