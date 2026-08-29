# Samantha analysis audit — coverage, schema, scoring

**Date:** 2026-08-29  
**Product:** Ammattialtistus (`sisapiiri`)  
**Remote:** https://github.com/samimiettinen/ammattialtistus-job-exposure  
**Branch:** `main`  
**Constraint:** AI exposure is not unemployment probability. Official statistics and AI estimates stay labelled. Notice remains: “AI-altistus ei tarkoita työpaikkojen katoamista”.  
**Out of scope:** chatbot, scenario simulator, decorative dashboard.

This file is the living record. Phases 1–2 are the audit and the proposed contract. Later sections are filled after each implementation phase.

---

## Phase 1 — Current coverage and architecture

### 1.1 What already exists

| Layer | Paths | Role |
|---|---|---|
| Catalog | `data/occupations.json` | 727 AML 2010 rows (11 / 44 / 131 / 437 / 104). App reads this file only. |
| Official employment | StatFin `115r`, year **2023** | Joined on undotted code. Missing → `null`. |
| Official outlook | Työvoimabarometri kohtaanto **2026-06** | 19-region employment-weighted composite, not a KEHA national index. Missing → `unavailable`. |
| Offline scores | `data/fixtures/scores.json`, `scripts/04`, SQLite `data/scores.db` | **24 labelled `fixture/2026-08-29` rows. 0 LLM rows.** Unscored stays unscored. |
| Workday | `POST /api/workday/analyze` | Runtime AI (or labelled fixture). Does not persist free text. |
| Bridges | `GET /api/occupations/:code/bridges`, `src/lib/bridges.ts` | Deterministic neighbours. Weights hardcoded in the scorer. |
| UI | Visualizer, detail panel, comparison, workday form | Official vs AI split exists. No situation card, no next-action cap, no results hierarchy. |
| Validation | `src/lib/pipeline/validate.ts`, `scripts/06` | Unique codes, score bounds, employment/outlook **share**. Not an analysis-quality coverage report. |

Reusable, do not rewrite: Next.js App Router, Zustand, Zod, next-intl (FI default, SV, EN), offline pipeline, official vs AI split, workday privacy flags, fixture labelling.

### 1.2 Catalog coverage on 2026-08-29 (committed `occupations.json`)

| Measure | Value | Note |
|---|---|---|
| All rows | 727 | Includes residual / unknown codes |
| Visual level-4 (not `X*`) | 436 | Treemap grain |
| Level-4 with employment | 419 / 437 (95.9 %) | Register year 2023 → `employmentStale: true` |
| Level-4 with outlook ≠ unavailable | 408 / 437 (93.4 %) | Barometer covers 420 four-digit codes; not all match |
| Outlook = shortage | **1** row in the whole catalog | Do not invent more |
| Scored (any) | **24** | All `scoreStatus: fixture` |
| LLM scores | **0** | Full catalogue is not invented |
| Rows with `recommendedSkills` | **0** | Skill lists are empty |
| Rows with task lists | **24** | Only fixture occupations |

Outlook mix (all levels): unavailable 319, surplus 295, balanced 103, mismatch 9, shortage 1.

### 1.3 Architectural gaps (quality, not chrome)

1. **Tasks silently stand in for skills.** `skillItems()` uses `recommendedSkills` when present, otherwise concatenates `AIApplicableTasks` + `humanCriticalTasks`. The UI cannot tell a transferable skill from a task label.
2. **No skill taxonomy.** Flat strings. No FI/SV/EN synonym layer. Fuzzy 5-character stem matching invents “overlap”.
3. **Bridge ranking is undocumented and title-sensitive.** Weights `0.48 / 0.22 / 0.25 / 0.05` live inside `occupationBridgeScore`. Task Jaccard includes `occupationNameFi`, so semantically similar titles rank as adjacent even without shared work.
4. **Bridges omit required explainability:** qualification barriers, human-critical capabilities, AI-exposure *difference*, data completeness, uncertainty-as-gate, suppression when quality is poor.
5. **No analysis coverage report.** `validateOccupations` counts employment/outlook share. It does not say which *evidence* a recommendation needed and lacked.
6. **No situation assessment.** Detail and workday jump to scores and task lists. Career change could be inferred from a high exposure tile.
7. **No capped, testable next actions.** Workday lists 3–5 raw skill strings.
8. **Results hierarchy is inverted.** Official block → AI block → bridges → sources. Samantha order is situation → evidence → capabilities → tasks → bridges → actions → methodology.
9. **Runtime AI may emit skill strings;** there is no deterministic overlap after extraction.
10. **Stale official employment (2023) is shown,** but a workday/occupation analysis is not marked as an analysis that depends on stale official inputs.

### 1.4 Privacy and hallucination (unchanged rules)

| Risk | Current mitigation | Keep |
|---|---|---|
| Workday free text | In-memory only; no echo; no analytics of descriptions | Yes |
| Fake official numbers | `null` / `unavailable` + “Tietoa ei saatavilla” | Yes |
| Full-catalog fake scores | 24 fixtures, rest unscored | Gate this |
| Exposure = job loss | Notice + prompts + tests | Yes |
| Wage invention | Forbidden keys on workday parse | Yes |
| Career change from exposure alone | **Not enforced** | Must add |

---

## Phase 2 — Proposed schema and scoring

No rematch of `data/occupations.json`. New fields are optional / Zod-defaulted. SQLite cache key stays  
`occupationCode + promptVersion + sourceDataHash + scoringModel`.  
Runtime workday text is never written to the catalog or SQLite.

### 2.1 Skill taxonomy (normalisation layer)

Canonical item (view-time; not a new official statistic):

```
SkillCategory =
  transferable
  | occupation_specific
  | tools_technologies
  | formal_qualification
  | interpersonal
  | decision_responsibility
  | physical_embodied

ClassifiedSkill = {
  id            // stable canonical id, language-independent
  category
  labels        // { fi, sv, en } — user-facing, never discarded
  source        // explicit_skill | normalized_task | user_workday
  original      // raw string before normalisation
  generic       // true → excluded from overlap numerator
}
```

Rules:

- Synonyms FI/SV/EN collapse to one `id`. Display uses `labels[locale]`.
- Duplicates collapse on `id`.
- Overly generic tokens (`työ`, `work`, `taito`, bare `viestintä`, bare `vastuu`) are marked `generic` and do not create overlap.
- Task labels may be *mapped* through the taxonomy, but the coverage report must say `skills: inferred_from_tasks`. They are not a silent skill list.
- Unmapped specific phrases become `occupation_specific` with a slug id, not a fake transferable skill.
- Formal qualifications are recorded only when the label or official description actually mentions a credential (Valvira, KHT, sähköpätevyys, …). Missing qualification data stays unavailable — never “you need a bachelor’s degree” invented from the title.

`recommendedSkills: string[]` remains on the occupation / score record for backward compatibility. Classified skills are derived at analysis time.

### 2.2 Coverage report

Per occupation (and a catalog roll-up for `scripts/06`):

```
CoverageFieldStatus = present | missing | stale | fixture | inferred_from_tasks | unavailable

CoverageReport = {
  occupationCode
  completeness          // 0–1, documented weights in src/lib/scoring/weights.ts
  fields: {
    officialEmployment, officialOutlook, officialDescription,
    aiScores, tasks, skills, qualifications, humanCritical
  }
  missingEvidence[]     // machine keys, UI-translated
  sufficientForBridges
  sufficientForSituation
  analysisStale
  inventedOfficialStats // must be false
}
```

**Validation gates** (fail the pipeline or reject an analysis, never silently fill):

| Gate | Rule |
|---|---|
| `no_invented_official_stats` | Employment, outlook, wages stay null/unavailable unless sourced |
| `no_full_catalog_fake_scores` | Fixture-only scores must not cover every visual level-4 occupation |
| `skills_not_silent_tasks` | If skills came only from tasks, status is `inferred_from_tasks`, not `present` |
| `career_change_not_from_exposure_alone` | Situation category `explore_adjacent_now` requires ≥ 2 independent signals |
| `missing_official_is_unavailable` | UI copy, never a guessed number |
| `fixture_labelled` | `scoringModel` starting `fixture/` or workday `fixture: true` |

### 2.3 Situation assessment (deterministic)

Inputs: selected occupation + optional workday task mix + coverage + top bridges.  
AI may have extracted tasks/skills; **category and prose slots are calculated**.

Independent signals (boolean):

| Signal | True when | Official? |
|---|---|---|
| `highRecurringTaskExposure` | Accelerate-share ≥ 0.40, or scored exposure ≥ 7 with task lists | AI estimate |
| `weakOfficialOutlook` | Outlook is `surplus` or `mismatch` | Official (if missing, signal is **absent**, not true) |
| `strongTransferableOverlap` | Best unsuppressed bridge transferable overlap ≥ 0.35 | Calculated |
| `sufficientData` | `coverage.sufficientForSituation` | Meta |

Categories:

| Category | Rule |
|---|---|
| `insufficient_evidence` | `!sufficientData` |
| `document_and_verify` | High uncertainty, stale official inputs, or skills only inferred — and not enough signals for a stronger call |
| `explore_adjacent_now` | `sufficientData` **and** `highRecurringTaskExposure` **and** (`weakOfficialOutlook` **or** `strongTransferableOverlap`) **and** at least two true signals. Exposure alone is never enough. |
| `strengthen_current_role` | Otherwise, when some valuable capabilities are documented |

Card always shows: category sentence (Samantha tone, FI/SV/EN), **why this recommendation**, **which evidence is missing**, source labels (official / AI estimate / user-provided / unavailable).

### 2.4 Career-bridge ranking — one weight file

**Single source:** `src/lib/scoring/weights.ts` (`BRIDGE_WEIGHTS`, thresholds, coverage weights, situation thresholds).

| Factor | Weight | Notes |
|---|---|---|
| Transferable-skill overlap | 0.28 | Jaccard on canonical transferable + interpersonal ids. Generic excluded. |
| Task overlap | 0.18 | Jaccard on normalised task tokens. **Occupation titles are not in the bag.** |
| Qualification distance | 0.14 | 1 − barrier. Unknown qualifications → 0.50 and a completeness penalty. Never invent a requirement. |
| Occupational-group proximity | 0.14 | 3-digit 1.00 / 2-digit 0.60 / major 0.30 / else 0.00 |
| Labour-market outlook | 0.10 | Official only. Unavailable → 0.35 + missing-evidence. Prefer shortage / less surplus than source. |
| AI-exposure difference | 0.08 | Prefer similar or slightly lower exposure. Unscored → 0.40 + penalty. Must not dominate. |
| Data completeness | 0.08 | Mean of source and target coverage. |

Overall overlap = Σ weightᵢ × factorᵢ, rounded to 3 decimals.  
Tie-break: if \|Δ\| < `BRIDGE_TIE_EPSILON` (0.03), sort by occupation code (stable, not arbitrary).

**Suppress** a neighbour when:

- pair completeness < `BRIDGE_MIN_COMPLETENESS` (0.28), or
- overall overlap < `BRIDGE_MIN_SCORE` (0.22), or
- the only non-zero structural factor would have been title similarity (titles are not a factor).

Each shown neighbour includes: overall score, retained transferable skills, missing occupation-specific skills, qualification/education barriers, human-critical capabilities, AI exposure, official outlook or unavailable, uncertainty, calculated adjacency explanation, missing evidence.

Limit remains 5 candidates in the API; the situation card highlights up to three.

### 2.5 Next actions (max 3)

After the situation card. Each action is concrete, proportionate, testable, tied to a named analysis field, and possible before a major career decision.

Allowed kinds only:

- `test_ai_on_task` — one accelerate/reporting task, measure time saved  
- `interview_adjacent` — one named neighbour  
- `short_intro_module` — one missing occupation-specific skill or tool (not “learn this in two hours”)  
- `document_coordination` — one week of hidden coordination / QA  
- `compare_qualifications` — official requirements of two adjacent codes, or “Tietoa ei saatavilla”

No generic reskilling catalogues. Each row: why produced + missing evidence.

### 2.6 Results hierarchy (UX)

1. Situation assessment  
2. Evidence and uncertainty  
3. Existing valuable capabilities  
4. Task-level findings  
5. Adjacent career options  
6. Next actions (≤ 3)  
7. Detailed methodology and sources (collapsed by default)

Labels on every block: official statistics / AI-generated estimate / user-provided / unavailable.

### 2.7 Schema / migration table

| Store | Change |
|---|---|
| `occupationSchema` | Additive optional `classifiedSkills[]` default `[]`. Catalog still parses. |
| `scoreRecordSchema` | Unchanged required fields. Optional classified skills not required from fixtures. |
| SQLite `scores` | Additive nullable `classified_skills TEXT`. Existing PK unchanged. |
| `validationReportSchema` | Additive coverage-gate fields (skill coverage, fake-score gate, errors/warnings). |
| Workday response | Additive optional `analysis` object (situation, coverage, bridges, actions). No `workdayText`. |
| `careerBridgeSchema` | Additive factor breakdown, barriers, human-critical, completeness, missing evidence. Old `overlap` / skill arrays remain. |
| `data/occupations.json` | **No rematch in this run.** |
| Postgres / Lovable | None. |
| URL state | Unchanged. |

### 2.8 Offline pipeline (phase 4 of the implementation order)

- LLM still must not emit employment, outlook, wages, or citations.  
- `recommendedSkills` if present are normalised through the taxonomy at enrich/merge; they do not become official.  
- Without `OPENAI_API_KEY`, only fixtures load. Unscored stays unscored.  
- `scripts/06` runs the new coverage gates. Fixture count of 24 / 436 visual level-4 must pass `no_full_catalog_fake_scores`.

---

## Implementation log

### Phase 3 — Coverage report and validation gates

Implemented. Per-occupation `buildCoverageReport` and catalog `buildCatalogCoverageReport` live in `src/lib/coverage/`. Gates: no invented official stats, no full-catalog fake scores, unlabelled fixtures, skills inferred from tasks flagged as `inferred_from_tasks`. `scripts/06` and `validateOccupations` emit the new fields.

**Tests:** `tests/coverage.test.ts` (full/partial reports, fake-score gate, invented official stats).

### Phase 4 — Offline analysis pipeline

Implemented without rematch. `parseLlmScoreResponse` rejects employment/outlook/wage keys. Scoring prompt forbids invented official numbers and says the model must not compute the final overlap score. Merge/enrich normalises skills through the taxonomy. SQLite gained additive `classified_skills`. Without an API key the pipeline still loads only 24 fixtures.

**Tests:** coverage catalog test on committed `occupations.json`; existing merge/schema tests still pass.

### Phase 5 — Situation-assessment card

Implemented in `src/lib/situation/assess.ts` + `AnalysisResults`. Categories: `explore_adjacent_now`, `strengthen_current_role`, `document_and_verify`, `insufficient_evidence`. Explore requires ≥ 2 independent signals. Exposure alone cannot produce a career-change category. Card always shows why + missing evidence. FI/SV/EN copy in Samantha tone.

**Tests:** `tests/situation.test.ts`.

### Phase 6 — Skill modelling and career bridges

Explicit taxonomy + synonym layer (`src/lib/skills/`). Overlap is Jaccard on canonical ids. Task labels are mapped but labelled `normalized_task`. Bridge ranking uses `BRIDGE_WEIGHTS` in `src/lib/scoring/weights.ts` only. Titles are not a ranking factor. Neighbours suppressed when completeness or overlap is too low. Each row shows overlap, retained transferable skills, missing occupation-specific skills, qualification barriers, human-critical capabilities, AI exposure, official outlook or unavailable, uncertainty, calculated explanation, missing evidence.

**Tests:** `tests/skills.test.ts`, `tests/bridges.test.ts` (including title-similarity and suppression), sensitivity in `tests/analysis-quality.test.ts`.

### Phase 7 — Localisation, actions, UX hierarchy

Results order: situation → evidence → capabilities → tasks → bridges → ≤3 actions → collapsed methodology. Source tags: official / AI / user / unavailable / calculated. Actions are testable and refuse “learn this in two hours” framing. FI default, SV, EN key trees match.

**Tests:** localisation tree + three-language situation copy; next-action cap.

### Phase 8 — Quality gates

2026-08-29:

| Check | Result |
|---|---|
| eslint | 0 errors, 2 pre-existing warnings (`layout` font, `UrlStateSync` hook) |
| tsc | pass |
| vitest | 16 files, **87** tests pass (was 13 files / 65 tests) |
| `next build` | pass |
| `scripts/06_validate` | `ok: true`, `fullCatalogFakeScores: false`, `inventedOfficialStats: false` |

No chatbot, scenario simulator, or decorative dashboard was added.

### Coverage before / after (visual level-4 = 436)

| Measure | Before | After |
|---|---|---|
| Official employment | 419 / 437 (95.9 %) | unchanged |
| Official outlook | 408 / 437 (93.4 %) | unchanged |
| Fixture scores | 24 | 24 |
| LLM scores | 0 | 0 |
| Explicit `recommendedSkills` | 0 | 0 (still not invented) |
| Task lists | 24 fixture rows | 24; now counted (`taskCoverage` 5.5 %) |
| Skill coverage (taxonomy, mostly inferred from tasks) | not measured | 6.7 % of visual L4 |
| Full-catalog fake scores | possible, untested | gated `false` |
| Invented official stats | possible, untested | gated `false` |

Known limits: most occupations remain unscored; explicit skill lists are empty until an offline LLM run emits them; formal qualifications are detected only from taxonomy / description hints, never invented; employment year is still 2023.
