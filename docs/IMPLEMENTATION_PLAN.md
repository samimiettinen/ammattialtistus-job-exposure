# Implementation plan — Ammattialtistus

**Product:** Finnish public-interest visualizer of theoretical AI exposure vs current AI adoption vs labour-market outlook for Ammattiluokitus 2010 (ISCO-08) occupations.

**Retrieval / planning date:** 2026-08-29  
**Workspace:** `/Users/samimiettinen/Dev/FinlandJobsAI/Untitled`  
**Inspiration (architecture only):** [sweden-job-market-visualizer](https://github.com/hamidfarmani/sweden-job-market-visualizer) and https://jobs.hamidfarmani.com — concept and pipeline shape only. No branding, copy, colours-as-brand, or assets are reused.

**Mandatory UI notice:** “AI-altistus ei tarkoita työpaikkojen katoamista”

---

## 1. What was inspected before coding parsers

Inspected live official endpoints and the inspiration repository **before** writing source-specific parsers. Findings are recorded in [SOURCE_DATA_MAPPING.md](./SOURCE_DATA_MAPPING.md). Summary:

| Source | Result on 2026-08-29 |
|---|---|
| Inspiration repo | Next.js 16 + ECharts + Zustand + offline GPT scoring + SQLite cache + `/api/occupations`. Pipeline `01`–`05`. UI never calls an LLM. |
| StatFin PxWeb | Live host is `pxdata.stat.fi`. Table **115r** returns employed persons by AML 2010 levels 1–5, years **2010–2023**. Variable codes below are from the live metadata, not from blogs. |
| Classifications API | `data.stat.fi/api/classifications/v2` — `ammatti_1_20100101` has 728 items, FI/SV/EN names, Finnish explanatory notes. Root `/v2` 404s; item routes work. |
| Työvoimabarometri | No dataset on avoindata.fi. The public site **does** expose JSON used by its own UI: `/api/ammatit` (420 four-digit AML codes) and `/api/Tyollisyys/kohtaanto/Ammatti/{id}/{yyyy-mm}` (19 regions). Latest observed month: **2026-06**. |
| Työmarkkinatori job ads API | Documented, OAuth-gated, ESCO/ISCO codes — **not used** (auth required, vacancies ≠ outlook). |
| Ammattibarometri | Replaced autumn 2023. No machine-readable successor dump on avoindata.fi. |

Parsers are written only against these inspected schemas.

---

## 2. Repository structure

```
docs/
  IMPLEMENTATION_PLAN.md
  SOURCE_DATA_MAPPING.md
src/
  app/
    [locale]/
      layout.tsx
      page.tsx                 # visualizer
      methodology/page.tsx
    api/occupations/route.ts
    globals.css
  components/                  # visualizer + shadcn primitives
  i18n/
  lib/
    schemas/                   # Zod
    pipeline/                  # shared fetch/parse/merge (used by scripts + tests)
    scoring/
    store.ts
    filters.ts
  messages/fi.json | sv.json | en.json
scripts/
  01_fetch_finnish_occupations.ts
  02_fetch_employment_counts.ts
  03_fetch_labor_market_outlook.ts
  04_score_occupations.ts
  05_merge.ts
  06_validate.ts
data/
  raw/                         # gitignored dumps
  fixtures/                    # small committed fixtures (scores + outlook samples)
  occupations.json             # merged catalog the app reads
  scores.db                    # generated SQLite cache (gitignored)
tests/
.env.example
```

---

## 3. Architecture decisions

1. **Offline scoring only.** Scripts may call an LLM. `src/app/api/*` and the client never do.
2. **SQLite is a pipeline cache**, not a production runtime dependency. The Next.js app reads `data/occupations.json`.
3. **No fabricated official statistics.** Missing employment, outlook or scores are `null` and rendered as unavailable.
4. **Fixture scores are labelled.** `scoringModel` starts with `fixture/` so the UI can distinguish them from LLM scores. The full AML catalogue is not invented.
5. **Outlook is official regional kohtaanto, nationally aggregated with a documented rule.** KEHA does not publish a single national occupation index via this API. We store the regional observations and a transparent employment-weighted national summary. See mapping doc.
6. **Visualizer grain:** AML 2010 **4-digit** unit groups (ISCO-08). Level 1 is the major-group filter. Finer 5-digit codes remain in the catalog for search/detail when present.
7. **i18n:** `next-intl`, default `fi`, locales `fi | sv | en`.
8. **URL state:** `nuqs` search params for tab, query, group, employment band, score band, outlook, selected code.
9. **Identity:** original Finnish public-interest look (warm paper, deep teal, high contrast). Not a clone of the Swedish site.

---

## 4. Incremental build order

| Step | Deliverable |
|---|---|
| a | This plan, mapping doc, Zod schemas, Next.js 16 scaffold, empty UI shells |
| b | Fetch scripts against real APIs + documented adapters |
| c | Merge + validate |
| d | Offline scorer + SQLite cache + fixture scores |
| e | `/api/occupations` |
| f | Treemap, scatter, filters, detail, i18n, URL state |
| g | Methodology page |
| h | Vitest: parsers, merge, API filters, score validation |
| i | README |

---

## 5. Scoring contract

- Cache key: `occupationCode + promptVersion + sourceDataHash + scoringModel`
- Resumable, idempotent, rate-limit aware
- Env: `OPENAI_API_KEY` (or `SCORING_API_KEY`) — see `.env.example`
- Without a key: load `data/fixtures/scores.json` only; remaining occupations stay unscored
- Rubric and Finnish-context rules live in `src/lib/scoring/prompt.ts` (`promptVersion` `2026-08-29.1`)

---

## 6. UI outline

- Tabs: **Altistus** · **Käyttöönotto** · **Työmarkkinanäkymä**
- Treemap: area = employed persons (2023), colour = selected metric (unscored = neutral hatch/grey)
- Scatter: theoretical exposure × current adoption
- Search: name (all locales) and code
- Filters: major group, employment size, score range, outlook, scored/unscored
- Detail: rationale, tasks, uncertainty, sources, data year, missing/stale flags
- Mobile-first sheet for detail; keyboard and reduced-motion support

---

## 7. Quality gates

- Unique occupation codes in the merged catalog
- Scores in 0–10 when present
- Hierarchy: every visualised 4-digit code has a known major group
- Provenance block on every record (`sourceUrls`, years, retrieval date)
- Tests for PxWeb parse, classification parse, kohtaanto aggregation, merge, API filters, Zod score bounds
