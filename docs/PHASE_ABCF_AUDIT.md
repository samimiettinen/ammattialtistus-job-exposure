# Phase A–F audit — market composition, tab-synced panels, regional kohtaanto, methodology

**Date:** 2026-08-29
**Branch:** `claude/ammattialtistus-opus5-sbmxl2`
**Base commit:** `a436bf5`
**Prerequisites:** `docs/PHASE12_AUDIT.md` and `docs/PHASE36_AUDIT.md` stay in place. Nothing there is reverted.

**Product constraint (unchanged):** AI exposure is a task-nature estimate, not a probability of unemployment. Official statistics and AI estimates stay visibly separate. The notice stays: “AI-altistus ei tarkoita työpaikkojen katoamista”.

---

## 1. Environment finding that bounds this run

The official endpoints are **not reachable** from this execution environment. The session's egress policy rejects the CONNECT for every source host:

| Host | Result 2026-08-29 |
|---|---|
| `data.stat.fi:443` | `connect_rejected` — gateway answered **403** to CONNECT |
| `pxdata.stat.fi:443` | `connect_rejected` — gateway answered **403** to CONNECT |
| `tyovoimabarometri.fi:443` | `connect_rejected` — gateway answered **403** to CONNECT |

Recorded by the session proxy's own status endpoint, not inferred from a client timeout. `data/raw/` is gitignored and absent, so no cached upstream payloads exist here either.

Consequences, applied honestly rather than papered over:

- **Phase D (`14sa.px`) and Phase E (`12ti.px`) are not started.** Both are gated on a live re-audit. Guessing their variable codes or joining them from the earlier notes without a fresh HTTP check would be exactly the fabrication the product forbids. Section 8 records what a future run must verify.
- **Phase C ships as plumbing, not as populated data.** The 19-region rows are already fetched by `scripts/03`, but they were never persisted onto the occupation record, and the committed `data/occupations.json` was merged before this change. The regional block therefore renders as *Tietoa ei saatavilla* until `npm run pipeline:03 && npm run pipeline:05` runs on a networked machine.
- **Phase G is not started** — no scoring key here, and the offline scorer stays the only source of occupation scores.
- **Phases A, B and F are unaffected.** They read the committed catalog only.

---

## 2. Catalog as it stands (measured, not assumed)

`data/occupations.json`, `generatedAt` 2026-08-29T10:53:59Z, 727 rows (11 / 44 / 131 / 437 / 104).

Visual grain = level 4 excluding `X*` → **436** rows.

| Measure | Value |
|---|---|
| Visual rows | 436 |
| Rows with an exposure score | **24** (5,5 %) — all `fixture/2026-08-29` |
| Rows unscored | 412 |
| Employed persons across visual rows | **2 314 785** (StatFin 115r, 2023) |
| Employed persons in *scored* rows | **664 224** |
| Employment coverage of the scored subset | **28,7 %** |
| Visual rows with no employment figure | 18 |
| Scored rows with no employment figure | 0 |

### 2.1 The honesty problem this phase must solve

An employment-weighted mean exposure over the scored rows is **3,95**. Presented bare, that reads as a statement about the Finnish labour market. It is not. It describes 28,7 % of employment and 5,5 % of occupations, and that subset is not a random sample — the fixture set deliberately covers large, recognisable occupations.

So the coverage strip is **not an optional footnote**: it renders before any mean, in the same block, on every tab. Josh Kale's and Karpathy's sidebars can print a bare weighted mean because their catalogs are fully scored (342/342). Ours is not, and the panel must say so first.

### 2.2 Distribution of the scored subset

Employed persons by exposure band, scored rows only (bands reuse the existing `scoreBand` helper, which the `scoreMeaning.*` i18n keys are already written against):

| Band | Occupations | Employed |
|---|---|---|
| 9–10 | 2 | 38 250 |
| 7–8 | 5 | 54 716 |
| 5–6 | 4 | 22 657 |
| 3–4 | 6 | 316 927 |
| 1–2 | 7 | 231 674 |
| 0 | 0 | 0 |

Adoption over the same rows: 9–10 → 0 occupations, 7–8 → 2 (38 250), 5–6 → 5 (54 716), 3–4 → 7 (166 841), 1–2 → 10 (404 417), 0 → 0.

Bucketing follows the existing `scoreBand` thresholds (`>= 7` lands in 7–8), not integer rounding, so a 6,8 stays in the 5–6 band.

Employment-weighted means over the scored subset: exposure **3,95**, adoption **3,06**.

### 2.3 Official outlook mix (all 436 visual rows, no score needed)

| Outlook | Occupations | Employed |
|---|---|---|
| Työvoimapula | **1** | 1 058 |
| Kohtaanto-ongelma | 9 | 53 456 |
| Tasapaino | 103 | 567 933 |
| Ylitarjonta | 295 | 1 692 288 |
| Ei koneluettavaa näkymää | 28 | 50 |

This is the panel that can be computed over the *whole* view, because it is official and does not depend on scoring. That asymmetry is the point of Phase B: the Työmarkkinanäkymä tab leads with a figure covering 100 % of the view, the AI tabs lead with one covering 28,7 %, and each says which.

### 2.4 Cross-tabs — where the data runs out

Exposure × official outlook, scored rows only:

| Outlook | Scored rows | Weighted mean exposure |
|---|---|---|
| Työvoimapula | **0** | unavailable |
| Kohtaanto-ongelma | **0** | unavailable |
| Tasapaino | 6 | 4,52 |
| Ylitarjonta | 18 | 3,79 |
| Ei koneluettavaa näkymää | **0** | unavailable |

Three of five cells are empty. They render as *Tietoa ei saatavilla* — never as 0.

Exposure × AML-2010 pääluokka, scored rows only:

| Pääluokka | Scored rows | Weighted mean exposure |
|---|---|---|
| 1 Johtajat | 1 | 7,20 |
| 2 Erityisasiantuntijat | 9 | 7,35 |
| 3 Asiantuntijat | 2 | 4,95 |
| 4 Toimisto- ja asiakaspalvelutyöntekijät | 1 | 8,60 |
| 5 Palvelu- ja myyntityöntekijät | 4 | 3,40 |
| 6 Maanviljelijät, metsätyöntekijät ym. | 1 | 2,20 |
| 7 Rakennus-, korjaus- ja valmistustyöntekijät | 3 | 2,13 |
| 8 Prosessi- ja kuljetustyöntekijät | 2 | 3,01 |
| 9 Muut työntekijät | 1 | 1,60 |
| 0 Sotilaat | **0** | unavailable |

Six of ten groups rest on one or two occupations. Every cell therefore prints its own **n**, so a one-occupation cell is visibly a one-occupation cell. No minimum-n suppression: hiding the count would be less honest than showing it next to the number.

---

## 3. What is deliberately **not** built

| Inspiration feature | Decision |
|---|---|
| “Wages exposed” headline (jobs × median pay, exposure ≥ 7) | **Omitted.** No sourced Finnish wage series exists in this catalog and none is invented. No salary field anywhere. |
| Weighted mean exposure by pay band | **Omitted**, same reason. |
| Weighted mean exposure by entry-education group | **Not built.** Requires Phase D, and `14sa` is *employed persons by education level* — a composition of who currently works there, not an entry requirement. It must never be relabelled as kelpoisuus. |
| `prompt.md` conversation dump | Out of scope. |
| Alternative scoring prompts (robotics / offshoring / climate) recolouring the map | Out of scope — no extra scoring axes. |
| Click-through to an occupational handbook | Deferred to Phase I; only verified `sourceUrls` may be deep-linked. |

---

## 4. Phase A — filter-aware market composition

New pure module `src/lib/market-composition.ts` + Zod types in `src/lib/schemas/composition.ts`. Computed from the **filtered** view, so it responds to search, group, outlook, employment and preset filters like everything else.

Rules encoded in the module, each covered by a test:

1. Coverage is computed per active metric, not once for the catalog.
2. Weighted means use `employedPersons` as the weight; rows with a null employment figure contribute **no weight** and are counted separately so the denominator is never silently smaller than it looks.
3. Zero weight → mean is `null` → renders as *Tietoa ei saatavilla*. Never 0.
4. Band buckets are emitted for all six bands whenever at least one row is scored, so an empty band is a real 0 within the scored subset; if nothing is scored, the whole histogram is unavailable.
5. The official outlook mix is computed over every row in view, scored or not.
6. Shares are always shares **of a stated denominator**: official shares divide by employment in view, AI shares divide by employment in scored rows.

## 5. Phase B — tab-synced official vs AI composition

Same component, order driven by `store.tab`:

| Tab | Leads with | Second |
|---|---|---|
| Työmarkkinanäkymä | Official outlook mix (100 % of view) | AI panel for exposure, with coverage |
| Altistus | AI exposure distribution + coverage strip | Official outlook mix |
| Käyttöönotto | AI adoption distribution + coverage strip | Official outlook mix |

Every block keeps its provenance tag (`Virallinen tilasto` / `Tekoälyn tuottama arvio`), reusing the wording already in `analysis.source*`. The coverage strip renders above the AI panel in all three tabs — reordering must not be able to hide it.

## 6. Phase C — regional kohtaanto

`scripts/03` already fetches the 19 regional rows per occupation and aggregates them. Two gaps closed:

1. `GET /api/Paikka/regions` was documented in the mapping doc but never fetched by the script, so `groupingId` (a UUID) had no name. The script now fetches it and stores the region list alongside the records; `groupingId` ↔ `regions.id` is the join already verified in `SOURCE_DATA_MAPPING.md` §3.2.
2. `mergeOccupations` dropped `OutlookRecord.regional`. The occupation record now carries `regionalOutlook[]` (optional, Zod-defaulted to `[]`, so the committed catalog still parses unchanged).

Displayed per region: outlook state, kohtaantoaste, and the barometer's own `toissa` / `tyottomat` / `tyopaikat` counts. Rows flagged `toissaSensuroitu` / `tyottomatSensuroitu` show the unavailable label for that number instead of a value — secrecy is not a zero. `kohtaantotila: 99` (`laskentavirhe`) is not rendered as an outlook.

The national chip keeps its existing labelled wording: employment-weighted composite of the regional rows, explicitly not a KEHA national index.

## 7. Phase F — methodology

Adds, from data already in the repo:

- the exposure and adoption calibration bands from `src/lib/scoring/prompt.ts`, as a table, in the page's own language
- the fixture AML examples actually present (24 codes, `fixture/2026-08-29`)
- `promptVersion`, scoring model, and retrieval dates
- live coverage numbers read from the catalog, so the page cannot drift from the data

Not added: the full prompt text as a copyable block, and no chatbot dump.

---

## 8. What a future networked run must verify before D and E

Do not implement either parser from these notes alone. Re-fetch first, and record the HTTP evidence in `docs/SOURCE_DATA_MAPPING.md`.

**Phase D — `tyokay/14sa.px`**
- Confirm the occupation variable still carries AML-2010 4-digit codes and how many join to the 436 visual rows.
- Confirm the education classification's own levels and its exact `code`/`text`.
- Stop if the join rate is poor. Education here is *the composition of people currently employed in the occupation*, never an entry requirement, and the UI copy must say so.

**Phase E — `tyonv/12ti.px`**
- Confirm the variable codes `Alue`, `Ammattiryhmä`, `timeperiod_m` are unchanged (the 2026-06-08 stamped-code migration did not touch this table as of the previous audit — verify, do not assume).
- Confirm both contents codes and the current latest month.
- Present only as a tightness proxy (unemployed jobseekers vs vacancies). Not an expert shortage grade, not a replacement for barometer kohtaanto, not job-ad heat.
- `X*` occupation classes stay excluded, and secrecy-suppressed cells stay unavailable.
