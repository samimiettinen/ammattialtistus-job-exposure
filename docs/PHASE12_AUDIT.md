# Phase 1–2 audit — richer detail panel and treemap UX

**Date:** 2026-08-29  
**Scope of this run:** audit + Phase 1 + Phase 2 only. Phases 3–6 are specified below as later work and must not be started here.  
**Product constraint:** AI exposure is not a probability of unemployment. Official statistics and AI estimates stay visibly separate.

---

## 1. Relevant existing files

| Area | Paths |
|---|---|
| Plan and sources | `docs/IMPLEMENTATION_PLAN.md`, `docs/SOURCE_DATA_MAPPING.md`, `README.md` |
| Catalog and API | `data/occupations.json`, `src/lib/catalog.ts`, `src/app/api/occupations/route.ts` |
| Schemas | `src/lib/schemas/occupation.ts`, `scores.ts`, `pipeline.ts`, `sources.ts` |
| Pipeline | `src/lib/pipeline/{classification,employment,outlook,merge,filters,validate}.ts`, `scripts/01`–`06` |
| Scoring (offline only) | `src/lib/scoring/{prompt,cache,hash}.ts`, `data/fixtures/scores.json` |
| UI | `src/components/{Visualizer,DetailPanel,FilterBar,OccupationTreemap,OccupationScatter,UrlStateSync,NoticeBanner}.tsx` |
| State / i18n | `src/lib/store.ts`, `src/messages/{fi,sv,en}.json` |
| Tests | `tests/{merge-filters,api-query,employment,classification,outlook}.test.ts` |

Current UI: level-4 treemap (flat, `nodeClick: false`), scatter, filter grid with search inside it, and a basic detail aside. Empty state is one sentence. Tooltip is code + name + headcount. `XXXX Tuntematon` (102 555 employed, 2023) is a normal level-4 tile and would dominate the map.

---

## 2. Reusable components and schemas

Reuse, do not replace:

- **`occupationSchema`** — already has employed persons, year, both scores, rationales, `humanCriticalTasks`, `AIApplicableTasks`, `uncertainty`, `sourceUrls`, `scoredAt`, `scoringModel`, `promptVersion`, `scoreStatus`, outlook, stale/missing flags.
- **`scoreRecordSchema` / fixture scores** — 24 labelled `fixture/2026-08-29` rows; `exposureRationale` is enough to derive three concise reasons (sentence split). No `recommendedSkills` in fixtures or the LLM JSON contract.
- **`filterOccupations` + `occupationQuerySchema`** — search, group, outlook, employment bands, score status, exposure/adoption bounds.
- **`mergeOccupations`** — nulls stay null; fixture vs LLM vs unscored is already labelled.
- **`DetailPanel`, `FilterBar`, `OccupationTreemap`, Zustand + `nuqs`** — extend in place.
- **`next-intl`** FI/SV/EN; Finnish default. Notice banner already shows the mandatory sentence.
- **Parsed hierarchy** — catalog contains levels 1–5 (11 / 44 / 131 / 437 / 104). `ParsedOccupation.parentCode` exists in the pipeline but is **not** on the merged occupation record. Group names for zoom can be joined from level 1–3 rows already in `occupations.json` (no rematch required).

Deterministic additions (no LLM):

| Field | Source |
|---|---|
| `exposureReasons` (view-time) | First three sentences of `exposureRationale` |
| `recommendedSkills` | Absent → show unavailable; optional schema default `[]` |
| `parentCode` | Optional on schema; derive `code.slice(0, -1)` when missing |
| Score “range” | Use `uncertainty` only. Do **not** invent numeric ± bands |
| Score meaning | Rubric bands already documented in `src/lib/scoring/prompt.ts` |

---

## 3. Required migrations

| Store | Phase 1–2 action |
|---|---|
| `data/occupations.json` | **No rematch required.** New occupation fields are optional / Zod defaults so the committed catalog still parses. |
| SQLite `data/scores.db` | **No schema change.** Skills are not written to the cache in this run. |
| Postgres / Lovable Cloud | **None.** The app is file-backed. |
| URL state | Additive `preset` search param (`largest` \| `high_exposure` \| `unused_potential` \| `shortage`). |
| i18n JSON | New keys in FI/SV/EN (unavailable copy, presets, summary, tooltip, onboarding, official vs AI labels). |

A later `pipeline:05` rematch may persist `parentCode` and, if a future scorer emits them, `recommendedSkills`. That is not required to ship Phase 1–2.

---

## 4. Proposed API contract (later phases — do not implement runtime AI now)

Existing (keep, no LLM):

```
GET /api/occupations
```

Query: current `OccupationQuery` plus optional `preset` (same four ids). Response stays `{ retrievedAt, provenance, total, count, occupations }`. This run may honour `preset` in the route as a thin wrapper over the same filter helpers; it still only reads `occupations.json`.

**Phase 3 — comparison (not this run)**

```
GET /api/occupations/compare?codes=2512,5321,7111
```

- Max 3–4 codes, level-4 only, classified only.
- Response: the same occupation records + a small derived table (employment, both scores, outlook). No generated prose.

**Phase 4 — “describe your workday” (not this run)**

```
POST /api/workday/analyze
```

Proposed body (Zod): `{ locale: 'fi'|'sv'|'en', occupationCode?: string, workdayText: string }` with a tight length cap.  
Proposed response: rubric-shaped JSON (`theoreticalAIExposure`, task lists, `uncertainty`, `distinguishesExposureFromDisplacement: true`) plus `{ kind: 'ai_estimate', model, promptVersion, scoredAt, disclaimer }`.  
Hard rules: never call this from the catalog merge; never write the result into official fields; never persist raw `workdayText`; never present the result as Statistics Finland / KEHA data.

**Phase 5 — offline scoring expansion (not this run except schema defaults)**

Same cache key (`occupationCode + promptVersion + sourceDataHash + scoringModel`). Optional `recommendedSkills[]` only if the offline scorer later emits it. UI already treats an empty list as unavailable.

**Phase 6 — career bridges (not this run)**

```
GET /api/occupations/:code/bridges
```

Deterministic neighbours (same major/2-digit group, outlook, score gap). No LLM.

---

## 5. Privacy and hallucination risks

**This run (Phases 1–2)**

- No new personal data, no runtime model, no user-text endpoint.
- Hallucination risk is **presentation**: fixture/LLM rationales and task lists can be read as official. Mitigation: labelled “Tekoälyn tuottama arvio” vs “Virallinen tilasto”; fixture vs unscored banners stay; missing official numbers render as *Tietoa ei saatavilla* / *Uppgift saknas* / *Information not available* — never a guessed headcount or outlook.
- Do not derive a fake score interval from `uncertainty`.
- Do not describe exposure as job-loss or unemployment probability (copy and tests must keep this).
- National outlook remains an employment-weighted composite of 19 regions, not a KEHA national index (existing `derivedOutlook` notice).
- Residual `XXXX` employment is real StatFin data but is **not** an occupation to colour or score; it belongs in a data-quality notice.

**Later Phase 4 (record only)**

- Free-text workdays can contain health, employer, or other identifiable detail. Design then: process in memory, do not log the body, do not store in `occupations.json` or SQLite, rate-limit, and refuse if the user asks for an unemployment probability.

---

## 6. Phase 1–2 implementation notes (this run)

1. **Detail panel** — official block (name, code, employed, year, outlook) and AI block (scores, uncertainty, three reasons, AI-accelerable tasks, human-responsibility tasks, skills, scoring date/model/prompt, sources). Empty panel: onboarding + three fixture examples (`2512`, `5321`, `7111`).
2. **Treemap tooltip** — full name, employed, active score + rubric meaning, uncertainty, one-sentence rationale, data-availability status.
3. **UX** — search above advanced filters; four presets; exclude `X*` / unknown from tiles; zoomable AML hierarchy (pääluokka → 2-digit → 3-digit → 4-digit); hide labels that cannot fit in full; keyboard/listbox alternative; view summary above the chart.
4. **Presets (deterministic)** — *Suurimmat ammattiryhmät*: 4-digit rows in the eight largest 2-digit groups by employment. *Korkea AI-altistus*: scored exposure ≥ 7. *Käyttämätön AI-potentiaali*: exposure ≥ 7 and exposure − adoption ≥ 2. *Työvoimapula*: `laborMarketOutlook === 'shortage'` (current catalog has very few such rows; do not invent more).

**Explicitly not started:** occupation comparison UI (P3), workday analyzer (P4), full offline rescoring / new official series (P5), career bridges (P6).
