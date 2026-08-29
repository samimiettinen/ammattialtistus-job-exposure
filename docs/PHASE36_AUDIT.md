# Phase 3–6 audit — comparison, data model, workday, career bridges

**Date:** 2026-08-29  
**Branch:** `cursor/ammattialtistus-job-exposure` (no new branch)  
**Prerequisite:** Phases 1–2 remain in place (`docs/PHASE12_AUDIT.md`). Do not revert those files.  
**Product constraint:** AI exposure is not a probability of unemployment. Official statistics and AI estimates stay visibly separate. Notice remains: “AI-altistus ei tarkoita työpaikkojen katoamista”.

**Implementation order:** Phase 3 → Phase 5 (schema/offline fields) → Phase 4 → Phase 6.

---

## 1. Files to reuse (do not rewrite the app)

| Area | Reuse |
|---|---|
| Catalog / API | `data/occupations.json`, `src/lib/catalog.ts`, `GET /api/occupations` |
| Schemas | `occupationSchema`, `scoreRecordSchema`, `occupationQuerySchema`, `llmScoreResponseSchema` |
| View helpers | `src/lib/occupation-view.ts` (`displayValue`, `listOrUnavailable`, `exposureReasonsFromRationale`, `buildOccupationDetailModel`) |
| Pipeline | `mergeOccupations`, `filterOccupations`, `scripts/04` + SQLite cache key |
| UI / state | `Visualizer`, `DetailPanel`, `FilterBar`, `OccupationListbox`, `UrlStateSync`, Zustand, `nuqs` |
| i18n | `src/messages/{fi,sv,en}.json`, `common.unavailable` |
| Tests / fixtures | `tests/helpers.ts`, `data/fixtures/scores.json` (24 labelled rows) |

Phase 1–2 UX (presets, zoomable treemap, onboarding, view summary, official vs AI split) stays. New UI is additive.

---

## 2. Schema migrations

No rematch of `data/occupations.json`. No invented catalog scores. New fields are optional / Zod-defaulted so the committed catalog still parses.

| Field | Strategy |
|---|---|
| `uncertainty`, `humanCriticalTasks`, `AIApplicableTasks`, `recommendedSkills`, `promptVersion`, `scoringModel`, `scoredAt` | Already on occupation / score records |
| `exposureReasons[]` | Derive deterministically from `exposureRationale` (first three sentences). Persist on merge/enrich; do not call an LLM |
| `exposureRangeLow` / `exposureRangeHigh` | Schema + cache columns. **Leave null** unless a score record already has them. Do **not** invent ± bands from `uncertainty` |
| `aiApplicableTasks[]` | Canonical store remains `AIApplicableTasks` |
| `evidence[]` | `{ url, kind }` derived from existing `sourceUrls` (official / classification). Never invent citations |
| `recommendedSkills[]` | Stay empty unless already present. Fixture prose is not mined into invented skill lists |

**SQLite `data/scores.db`:** same primary key  
`occupationCode + promptVersion + sourceDataHash + scoringModel`.  
Additive nullable columns for skills / ranges / reasons / evidence. Cache only non-personal occupation analyses. Runtime workday text is never written here.

**URL state (additive):** `compare` = comma-separated 2–4 AML codes (order preserved). Existing `q`, `code`, `preset`, `tab` unchanged.

**Postgres / Lovable Cloud:** none. File-backed app.

---

## 3. API contract

Existing, unchanged:

```
GET /api/occupations
```

**Phase 3**

```
GET /api/occupations/compare?codes=2512,5321,7111
```

- 2–4 unique level-4 classified codes. `X*` / unknown rejected.
- Response: catalog records + a derived comparison table (employment, both scores, outlook, tasks, skills, uncertainty, sources).
- No generated prose. Missing official/AI fields render via the same unavailable labels as the detail panel.

**Phase 4**

```
POST /api/workday/analyze
```

Body (Zod): `{ locale: 'fi'|'sv'|'en', occupationCode?: string, jobTitle?: string, workdayText: string }`  
Caps: title ≤ 160, text 20–2000 characters.

Response (strict Zod, no free-text echo):

1. Up to 3 AML 2010 matches + confidence; `status: "ambiguous"` when the user must choose  
2. 8–12 tasks, each `accelerate` \| `assist` \| `human` \| `insufficient`  
3. Separate ranges: share of tasks AI may accelerate; share of the role plausibly automatable (0–1, low ≤ high)  
4. 3–5 skills  
5. Citations from the **selected occupation record only**  
6. Envelope `{ kind: "ai_estimate", fixture?: boolean, distinguishesExposureFromDisplacement: true }`

Matching is deterministic against the catalog (no LLM-invented codes). The model only personalises/maps the user description onto the chosen record.  
Without `OPENAI_API_KEY`: HTTP 503 + UI error, unless `WORKDAY_DEV_FIXTURE=1` (clearly labelled fixture, never official).  
Model id / keys stay server-side.

**Phase 6**

```
GET /api/occupations/:code/bridges
```

Deterministic neighbours from structured task/skill overlap + hierarchy. No LLM similarity.  
Optional explain: calculated template always; if no key, no LLM prose (static unavailable note).  
No salary field.

---

## 4. Privacy and hallucination risks

| Risk | Mitigation |
|---|---|
| Workday free text (health, employer, identifiers) | Process in memory only. Do not log the body. Do not write `occupations.json`, SQLite, or analytics. Do not echo `workdayText` in the JSON response. Rate-limit by IP, not by text |
| Sensitive attributes | Prompt forbids inference (health, ethnicity, union, employer, immigration). Schema rejects wage / unemployment-probability keys |
| Catalog hallucination | Runtime AI must not rescore the occupation database. Unscored stays unscored |
| Fake official numbers | Comparison and bridges use `displayValue` / unavailable copy. No invented employment, outlook, wages, or citations |
| Exposure ≠ unemployment | Copy, prompts, and tests keep the mandatory notice. Automatable-share is task-mix, not job-loss |
| Fixture / dev mode | Labelled `fixture: true`. UI must not present it as Statistics Finland / KEHA |
| Career-bridge invention | Similarity is Jaccard + code prefix only. AI may later explain calculated rows; it must not propose extra neighbours |
| Cache poisoning | Version occupation caches by code + source hash + prompt version + model. Never cache personal workday input |

---

## 5. Phase notes

### Phase 3 — comparison

- Zustand `compareCodes` + `nuqs` `compare` param.  
- **Vertaa** on the detail panel and on search-result rows. Tray when 1–4 codes are selected; card when ≥ 2.  
- Compact printable card (official vs AI rows). Client-side canvas PNG only (no external image service). Share = current URL.

### Phase 5 — data model / offline analysis

- Enrich at load/merge: `exposureReasons`, `evidence`. Ranges stay null.  
- Offline scorer (`scripts/04`) may persist optional new fields if a future run emits them; it stays resumable, idempotent, and unused by the UI for catalog scoring.

### Phase 4 — workday

- Prominent “Kirjoita ammattisi tai kuvaile työpäiväsi”.  
- Grounding payload: selected occupation + official name/description + existing scored tasks/rationales + user text.  
- Timeouts, length limits, Zod rejection of malformed model output. UI works without a key (error state).

### Phase 6 — career bridges

- “Läheiset uravaihtoehdot” under the selected occupation.  
- Overlap score, retained / missing skills (task lists proxy when `recommendedSkills` is empty), outlook, exposure, uncertainty, calculated “why adjacent”.  
- Omit salary entirely (no sourced Finnish wage series).

---

## 6. Tests (after each phase: unit tests + `tsc`)

- P3: compare URL parse/serialize; missing-data comparison rendering.  
- P5: Zod occupation/score/evidence fields; provenance (`sourceUrls`, model, prompt, scoredAt).  
- P4: malformed AI output; matching; ambiguity; range validation; no persistence of free text.  
- P6: overlap ranking from structured fields (not LLM); missing skills; no salary.  
- End: lint, `tsc`, unit tests, production build. Browser: comparison, workday error-without-key, bridges, shared `compare` URL.
