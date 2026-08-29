# Official source mapping — occupation hierarchy, employment, labour-market outlook

**Retrieval date:** 2026-08-29  
**Method:** Official documentation pages plus live HTTP GET/POST. Field names below are copied from responses actually received. Nothing here is inferred from blogs or old table IDs.  
**Workspace note:** Raw response bodies from this retrieval are under `_source_research/` (not part of the product).

---

## 0. What changed on the StatFin side (must not ignore)

On **8 June 2026** Statistics Finland shortened PxWeb identifiers and switched API queries from variable *names* to variable *codes*.

| Inspected | URL | HTTP |
|---|---|---|
| News | https://stat.fi/en/news/Changes-to-interface-use-of-PxWeb-databases-on-8-June-change-interface-queries-as-instructed | 200 (via WebFetch) |
| Instructions | https://stat.fi/en/services/statistical-data-services/open-data-and-interfaces/interface-use-of-databases/instructions-for-updating-interface-queries | 200 (via WebFetch) |

Documented after-change rules (confirmed live):

1. Table file name / TABLEID / MATRIX are the short id only: `115q.px`, not `statfin_tyokay_pxt_115q.px`.
2. Query keys are `VARIABLECODE` values (`contentscode`, `timeperiod_y`, `ammatti_104_20161021`, …), not the English/Finnish label.
3. Some content-value codes gained a prefix. Employment table `115q` uses `tyokay-tyolliset2` (observed).

**Live check of the old long id:**  
`GET https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin/tyokay/statfin_tyokay_pxt_115q.px` → **HTTP 400** body `Bad Request`.

**PxWeb API v2:**  
`GET https://pxdata.stat.fi/PxWeb/api/v2/en/tables` → **404 HTML**.  
`GET https://pxdata.stat.fi/api/v2/tables` → **404 HTML**.  
StatFin is PxWeb **API v1** only on 2026-08-29.

**Canonical host:** `https://pxdata.stat.fi` (also reachable as `https://statfin.stat.fi` and `https://pxweb2.stat.fi` — same StatFin listing, HTTP 200).

---

## 1. Ammattiluokitus 2010 / ISCO-08 hierarchy

### 1.1 Statistics Finland open classifications API (preferred)

| Item | Value |
|---|---|
| Source name | Statistics Finland open classifications API (GSIM model) |
| Docs | https://stat.fi/en/luokitukset/info |
| Human page | https://stat.fi/en/luokitukset/ammatti/ammatti_1_20100101 |
| Alias host | `https://data.stat.fi/api/classifications/v2/...` |
| Canonical URI host in payloads | `https://api.stat.fi/classificationservice/open/api/classifications/v2/...` |
| Classification id | `ammatti_1_20100101` |
| Series id | `ammatti` (keywords include `isco`) |
| Validity | `releaseDate` `2010-01-01`, `terminationDate` null, `modifiedDate` `2024-05-06T07:03:57Z` |
| License | Statistics Finland open data **CC BY 4.0** — https://stat.fi/en/about-us/get-to-know-statistics-finland/legislation/terms-of-use and https://stat.fi/en/services/statistical-data-services/open-data-and-interfaces |
| Machine-readable | Yes (JSON). CSV button on the HTML page exists; guessed download URL `https://stat.fi/en/luokitukset/download?classific=ammatti_1_20100101` returned **404**. Use the API, not that guess. |

#### HTTP attempts (2026-08-29)

| URL | Status | What came back |
|---|---|---|
| `https://data.stat.fi/api/classifications/v2/` | **404** | `{"statusCode":404,"message":"Resource not found"}` — no root index |
| `https://data.stat.fi/api/classifications/v2/swagger` | **404** | same |
| `https://api.stat.fi/classificationservice/open/swagger/index.html` | **404** | same |
| `https://data.stat.fi/api/classifications/v2/classifications?search=ammatti` | **200** | JSON **array of URI strings**, **448** entries. Query `search=ammatti` did **not** filter — the list includes `kunta_*`, `toimiala_*`, etc. First occupation URI: `.../classifications/ammatti_1_20100101` |
| `https://data.stat.fi/api/classifications/v2/classifications/ammatti_1_20100101` (no query) | **200** | `["https://api.stat.fi/classificationservice/open/api/classifications/v2/classifications/ammatti_1_20100101"]` — URI only |
| `.../ammatti_1_20100101?content=data&meta=max&lang=en` | **200** | Full classification object (list length 1) |
| `.../classificationItems?content=data&meta=max&lang=en` | **200** | **728** items, 470 387 bytes |
| `.../classificationItems?content=data&meta=max&lang=fi` | **200** | **728** items, 2 350 405 bytes (notes present) |
| `.../classificationItems?content=data&meta=max&lang=sv` | **200** | **728** items, names in Swedish |
| `.../classificationItems/ammatti_1_20100101%2F2512?...` | **404** | single-item path does not exist |
| `.../ammatti_1_20100101/levels?...` | **404** | no levels collection |
| `.../correspondenceTables/ammatti_1_20100101%23ammatti_1_20010101?...` | **404** | wrong direction |
| `.../correspondenceTables/ammatti_1_20010101%23ammatti_1_20100101?content=data&meta=max&lang=en` | **200** | correspondence **metadata only** (no maps array in this response) |
| Same metadata via `https://api.stat.fi/classificationservice/open/api/...` | **200** | identical body to `data.stat.fi` alias |

**Required query params for objects (not URI lists):** `content=data&meta=max&lang={fi\|sv\|en}`.  
One language per request. Names are **not** multilingual in a single payload.

#### Classification object fields (actual keys)

From `GET .../classifications/ammatti_1_20100101?content=data&meta=max&lang=en`:

```
classificationSerie.localId                  = "ammatti"
classificationSerie.classificationSerieName  = [{langName, lang, name}]
localId                                      = "ammatti_1_20100101"
modifiedDate, releaseDate, terminationDate
predecessorStatId                            = "ammatti_1_20010101"
derivedFrom                                  = null
internationalRecommendation                  = true
nationalRecommendation                       = true
legalBase                                    = ""
classificationName                           = [{langName, lang, name}]
classificationDescription                    = [{langName, lang, description}]
classificationChangesFromPreviousVersion
classificationChangesFromBaseClassification
classificationPurpose
classificationDetailedDescription
classificationRelationshipToInternationalStandards
publications[].type, topic, url
```

Observed names:

| lang | classificationName |
|---|---|
| en | Classification of Occupations 2010 |
| fi | Ammattiluokitus 2010 |
| sv | Yrkesklassificeringen 2010 |

Publications returned in the EN metadata object:

- Handbook 14 (FI PDF): `https://urn.fi/URN:NBN:fi-fe2023013125020`
- Deviations from ISCO-08: `https://www.stat.fi/media/uploads/classication_attachments/deviations_from_isco_08.docx`

Official text in `classificationRelationshipToInternationalStandards`: national AML 2010 is based on **ISCO-08**; Commission Recommendation **2009/824/EC**. Official text in `classificationDetailedDescription`: five hierarchical levels — 10 main groups (1-digit), 43 two-digit, 130 three-digit, 436 four-digit, **103 national five-digit** groups.

API item counts (includes total + unknown + empty placeholders, so they do not equal the handbook counts):

| `level` | count |
|---|---|
| 0.0 | 1 (`SSSSS` Occupations total / Ammatit yhteensä / Yrken totalt) |
| 1.0 | 11 |
| 2.0 | 44 |
| 3.0 | 131 |
| 4.0 | 437 |
| 5.0 | 104 |
| **total** | **728** |

#### Classification item fields (actual keys)

```
classification.localId
classification.internationalRecommendation
classification.nationalRecommendation
classification.classificationName[]
classification.classificationDescription[]
localId                 e.g. "ammatti_1_20100101/2512"
level                   number (0.0–5.0)
code                    e.g. "2512"
order                   integer
parentItemLocalId       e.g. "ammatti_1_20100101/251"
parentCode              e.g. "251"
classificationItemNames[]   {langName, lang, name}
explanatoryNotes[]          {type[], langName[], lang[], generalNote[], includes[], includesAlso[], excludes[]}
classificationIndexEntry[]  {text[]}
```

**Code `2512` (2026-08-29):**

| lang | `classificationItemNames[].name` |
|---|---|
| en | Software developers |
| fi | Sovellussuunnittelijat |

**Descriptions are language-asymmetric:**

- `lang=en`: `explanatoryNotes` is `[]` on all 728 items.
- `lang=sv`: first items also had empty notes (not fully counted).
- `lang=fi`: **714 / 728** items have notes. For `2512`, `explanatoryNotes[0].generalNote` is a Finnish task description; `excludes` includes `"- ohjelmoija (2514)"`.

There is **no English description field** in the EN items payload.

#### Correspondence / ISCO mapping

- Series keywords include `isco`. Official metadata says AML 2010 follows ISCO-08 at 1–4 digits with national exceptions (docx above).
- Conversion key **AML 2001 → AML 2010** exists: `localId` `ammatti_1_20010101#ammatti_1_20100101`, fields `source`, `target`, `sourceClassification`, `targetClassification`, `modifiedDate`, `correspondenceTableTexts`.
- **Item-level map rows were not in that metadata response.** A `/maps` or maps-inside-items path was not successfully retrieved. Do not invent map field names.
- `correspondenceTables?search=isco` returned the **unfiltered** 332-URI list (same non-filtering behaviour as `classifications?search=`).

#### Recommended fetch (scripts)

```
GET {host}/classifications/v2/classifications/ammatti_1_20100101?content=data&meta=max&lang=en
GET {host}/classifications/v2/classifications/ammatti_1_20100101/classificationItems?content=data&meta=max&lang=fi
GET ...&lang=sv
GET ...&lang=en
```

Merge on `code` (or `localId`). Use FI `explanatoryNotes` for descriptions; EN/SV for names. Host either `https://data.stat.fi/api` or `https://api.stat.fi/classificationservice/open/api`. Cache: classification `modifiedDate` is 2024-05-06; refresh rarely.

**Gaps:** no EN/SV notes in API; no working single-item GET; no verified correspondence-map rows; no working CSV download URL from this retrieval; `search=` is not a filter.

---

### 1.2 koodistot.suomi.fi (YTI / DVV) — same classification, different schema

| Item | Value |
|---|---|
| UI | https://koodistot.suomi.fi/codescheme;registryCode=jhs;schemeCode=ammatti_1_20100101 |
| Scheme | `GET https://koodistot.suomi.fi/codelist-api/api/v1/coderegistries/jhs/codeschemes/ammatti_1_20100101/?format=json` → **200** |
| Codes | `GET .../codes/?format=json` → **200**, `meta.totalResults` **727** |

Scheme fields actually returned: `id`, `codeValue` (`ammatti_1_20100101`), `uri` (`http://uri.suomi.fi/codelist/jhs/ammatti_1_20100101`), `url`, `codesUrl`, `extensionsUrl`, `prefLabel` `{en,fi,sv}`, `definition`, `description`, `changeNote`, `startDate` (`2010-01-01`), `created`, `modified` (`2019-05-14T10:10:47.749Z`), `status` (`VALID`), `version` (`1`), `governancePolicy` (`Kansallinen suositus (JHS)`), `infoDomains`, `languageCodes`, `externalReferences`, `organizations`, `cumulative`, `codeRegistry`, `totalNrOfSearchHitsCodes`, `totalNrOfSearchHitsExtensions`.

Code object fields: `id`, `codeValue`, `uri`, `url`, `status`, `order`, `hierarchyLevel`, `startDate`, `created`, `modified`, `prefLabel` `{en,fi,sv}`, `description` `{fi,...}`, `codeScheme`, `membersUrl`, optional `broaderCode`.

**Useful vs StatFin API:** one payload has FI+SV+EN `prefLabel`. Descriptions are FI-only and often stubs (`"Luokan yleiskuvaus:  Tähän kuuluu:  Tähän ei kuulu:"`). Count **727** vs StatFin **728** (koodistot listing starts at `0`, no `SSSSS` total). `modified` 2019 vs StatFin 2024 — **StatFin API is newer**.

**License on the portal footer:** YTI **source code** is EUPL-1.2. That is the software, not a dataset licence for AML 2010. Treat occupation content as Statistics Finland’s classification (CC BY 4.0 + attribution). No separate AML licence string was in the scheme JSON.

---

### 1.3 avoindata.fi

| Query | HTTP | Result |
|---|---|---|
| `package_search?q=ammattiluokitus` | 200 | **1** hit: JHS 186 compilation (`jhs-186-luokitussuositusten-koontisuositus`), `license_id` `other`, last modified 2020-06-15. Not a live code list. |
| `package_search?q=työvoimabarometri` | 200 | **count: 0** |
| `package_search?q=ammattibarometri` | 200 | **count: 0** |
| `package_search?q=keha` | 200 | **7** hits — Helsinki-region unemployment republished from KEHA/StatFin, **not** Työvoimabarometri. |

---

## 2. Employed persons by occupation

### 2.1 PxWeb API configuration (live)

`GET https://pxdata.stat.fi/PxWeb/api/v1/fi/?config` → **200**

```json
{"maxValues":120000,"maxCells":120000,"maxCalls":40,"timeWindow":60,"CORS":true}
```

Docs: https://pxdata.stat.fi/api1.html and https://statfin.stat.fi/api1.html (same family). Formats documented: xlsx, csv, json, json-stat, json-stat2, px. Always append `.px`. Contact: `tietokannat@stat.fi`.

`GET https://pxdata.stat.fi/PxWeb/api/v1/en/` → **200**, databases (`dbid`): `Check`, `Hyvinvointialueet`, `Kokeelliset_tilastot`, `Kuntien_avainluvut`, `Kuntien_talous_ja_toiminta`, `Maahanmuuttajat_ja_kotoutuminen`, `NOVI-fi`, `Postinumeroalueittainen_avoin_tieto`, `SDG`, **`StatFin`**, `StatFin_Passiivi`.

`GET .../en/StatFin` → **200**, **135** subject folders (`id`, `type`, `text`). Employment folder is `tyokay`.

Free-text search works: `GET .../en/StatFin?query=occupation` → **200**, objects `{id, path, title, score, published}`.

License: **CC BY 4.0**, cite Statistics Finland. Example form on the terms page: Official Statistics of Finland (OSF), table id, URL, referenced date.

### 2.2 Employment statistics (`tyokay`) — register-based employed counts

Docs: https://stat.fi/en/statistics/documentation/tyokay  
UI folder: https://pxdata.stat.fi/PxWeb/pxweb/en/StatFin/StatFin__tyokay/  
`GET https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin/tyokay` → **200**, **28** tables.

Occupation-by-AML-2010 tables actually listed:

| Table id | Title (EN listing) | Updated (listing) |
|---|---|---|
| `115q.px` | Employed persons by occupation group (Classification of Occupations 2010, **levels 1 to 5**), occupational status, sex and year, **2010–2023** | 2026-07-01T18:05:05 |
| `115r.px` | … levels 1 to 5, sex, age and year, **2010–2023** | 2026-07-01T18:05:05 |
| `115s.px` | … levels 1 to 3, area, sex and year, **2010–2023** | 2026-07-01T18:05:05 |
| `115t.px` | … levels 1 to 2, background country, sex and year, **2010–2023** | 2026-07-01T18:05:05 |
| `14sa.px` | Employed labour force by occupational group (AML 2010), level of education and year, **2010–2023** | 2026-07-01T18:05:07 |
| `14sb.px` | Employed labour force in cultural occupations by employer sector, 2010–2023 | 2026-07-01T18:05:07 |

JSON-stat2 `source` on `115q`: `"Statistics Finland, employment"`.  
`extension.px.tableid` / `matrix`: `"115q"`.  
`note`: reference period is last week of year (25–31 December); figures are final.  
`updated` inside json-stat2: `2025-06-03T05:00:00Z`.

#### `115q.px` metadata — actual variable codes (EN GET)

`GET https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin/tyokay/115q.px` → **200**  
Top-level keys: `title`, `variables`. `title` = `"Employed"`.

| `code` | `text` | n | values (ends) | elimination |
|---|---|---|---|---|
| `ammatti_104_20161021` | Occupational group | 1189 | `SSSSS` … `XXXXX` | true |
| `sukupuoli_9_20180101` | Sex | 3 | `SSS`, `1`, `2` (Total, Males, Females) | true |
| `ammattiasema_7_20121201` | Occupational status | 3 | `SS`, `1`, `2` (Total, Wage and salary earners, Entrepreneurs) | true |
| `timeperiod_y` | Year | 14 | **2010–2023** | (`time`: true) |
| `contentscode` | Information | 2 | `tyokay-tyolliset2` (Employed), `tyokay-osuus` (Share, %) | |

Occupation code inventory in **this table** (not the same as the 728-item classification):

- 418 four-digit numeric codes
- 103 five-digit numeric national codes (e.g. `11121`)
- 486 **dotted** codes (`0110.`, `2512.`-style placeholders)
- totals / unknown: `SSSSS`, `X`, `XX`, `XXX`, `XXXX`, `XXXXX`

`115r` shares `ammatti_104_20161021` (1189 values) and years 2010–2023; extra var `ikaryhma_10_20180101` values `SSS`,`18-24`,`25-34`,`35-44`,`45-54`,`55-64`,`65-74`; contents only `tyokay-tyolliset2`.

`115s` same occupation code **name** but only **184** values (levels 1–3); area `alue_28_20250101` values `SSS`,`MK01`…`MK21` (19 regions + whole country); years 2010–2023.

#### Live POST `115q` (2026-08-29)

Body:

```json
{
  "query": [
    {"code":"ammatti_104_20161021","selection":{"filter":"item","values":["2512"]}},
    {"code":"sukupuoli_9_20180101","selection":{"filter":"item","values":["SSS"]}},
    {"code":"ammattiasema_7_20121201","selection":{"filter":"item","values":["SS"]}},
    {"code":"timeperiod_y","selection":{"filter":"item","values":["2023"]}},
    {"code":"contentscode","selection":{"filter":"item","values":["tyokay-tyolliset2"]}}
  ],
  "response":{"format":"json-stat2"}
}
```

**HTTP 200.** json-stat2 keys: `version` `"2.0"`, `class` `"dataset"`, `label`, `source`, `updated`, `note`, `role`, `id`, `size`, `dimension`, `extension`, `value`.

`id`: `["ammatti_104_20161021","sukupuoli_9_20180101","ammattiasema_7_20121201","timeperiod_y","contentscode"]`  
`value`: **`[35435]`** — employed persons coded 2512, both sexes, all statuses, year 2023.

Same query `response.format=json`:

```json
{
  "columns":[
    {"code":"ammatti_104_20161021","text":"Occupational group","type":"d"},
    {"code":"sukupuoli_9_20180101","text":"Sex","type":"d"},
    {"code":"ammattiasema_7_20121201","text":"Occupational status","type":"d"},
    {"code":"timeperiod_y","text":"Year","type":"t"},
    {"code":"tyokay-tyolliset2","text":"Employed","type":"c"}
  ],
  "data":[{"key":["2512","SSS","SS","2023"],"values":["35435"]}],
  "comments":[],
  "metadata":[{"updated":"2025-06-03T05.00.00Z","label":"...","source":"Statistics Finland, employment"}]
}
```

**PxGraf:** https://stat.fi/en/services/statistical-data-services/statistical-databases/px-suite describes PxGraf as Statistics Finland’s **charting** tool (open source). `https://pxgraf.stat.fi/` **did not resolve (DNS)**. PxGraf is **not** a public occupation-data API.

### 2.3 Labour Force Survey (`tyti`) — survey employed, thousand persons

`13au.px` — Employed persons aged 15–74 by occupation (AML 2010) and sex, **2013–2025**.  
`GET .../en/StatFin/tyti/13au.px` → **200**.

| `code` | `text` | values |
|---|---|---|
| `timeperiod_y` | Year | 2013–2025 |
| `sukupuoli_9_20180101` | Sex | `SSS`,`1`,`2` |
| `ammatti_19_20180101` | Occupation 2010 | 51 values (`SSS`,`0`,`1`,`11`…`96`,`X`) — **1–2 digit / Px list**, not 4-digit |
| `contentscode` | Information | `tyti-Tyolliset` = `"Employed, 1000 persons"` |

POST json-stat2 (2025, SSS, `25`, `tyti-Tyolliset`) → **200**, `value`: **`[112]`**, `source`: `"Statistics Finland, labour force survey"`, `updated`: `2026-01-27T06:00:00Z`. Note in payload: LFS renewed 2021; table **13au replaces 11ql** (archived); series not comparable with pre-renewal.

Use **115q/115r** for 4–5 digit counts. Use **13au** only if a 2-digit survey series through 2025 is needed.

### 2.4 Recommended employment fetch

1. `GET` metadata for `115q.px` (or `115r.px`) every run — codes are table-specific after 8 June 2026.
2. `POST` `json-stat2` or `json`. Filter `ammatti_104_20161021` to the 4-digit (and 5-digit if needed) codes you actually display; `sukupuoli_9_20180101=SSS`; `ammattiasema_7_20121201=SS`; `timeperiod_y` latest (`2023` as of this retrieval); `contentscode=tyokay-tyolliset2`.
3. Respect **40 calls / 60 s** and **120 000 cells**.
4. Join to classification on the **undotted** code. Dotted Px codes (`2512.`) are not AML `2512`.
5. Latest register year is **2023**, not 2025/2026.

**Gaps:** no 2024–2025 register occupation counts in these tables; 115q mixes levels and dotted fillers; LFS 13au is too coarse for a 4-digit visualizer.

---

## 3. Labour-market outlook / shortage / surplus

Three official layers exist. Only one is a documented open statistical API. The barometer JSON is the UI backend, **not** published as open data.

### 3.1 KEHA Employment Service Statistics via StatFin (`tyonv`) — documented, machine-readable

Published **on StatFin** with `source` (json-stat2): **`"KEHA Centre, Employment Service Statistics"`**.  
Docs: https://stat.fi/en/statistics/documentation/tyonv  
`GET .../en/StatFin/tyonv` → **200**, **72** tables. Latest monthly tables run **2009M01–2026M07**.

Most relevant occupation tables (listing text, not guessed):

| id | title fragment |
|---|---|
| `12ti.px` | Unemployed jobseekers and vacancies by occupation at the **end of the month** (1270), 2009M01–2026M07 |
| `12tt.px` | Jobseekers and vacancies by occupation **during the month** (1370) |
| `12tj.px` | Unemployed, fully laid off and on reduced working week by occupation |
| `12tu.px` | Jobseekers and vacancies by occupation in each province during the month |

#### `12ti.px` live metadata

`GET .../en/StatFin/tyonv/12ti.px` → **200**

| `code` | `text` | n / values |
|---|---|---|
| `Alue` | Region | 421; `SSS`, `KU*`, `ELY*`; `map` = `Alue 2026` |
| `Ammattiryhmä` | Occupation | **434**; 4-digit AML-like codes plus **X** classes (`X011` Self-employed … `X999` Undefined) |
| `timeperiod_m` | Month | **2009M01–2026M07** |
| `contentscode` | Information | `TYOTTOMATLOPUSSA` = Unemployed jobseekers on calculation date (number); `AVPAIKATLOPUSSA` = Vacancies on end-of-month calculation date (number) |

Note: after 8 June 2026 many tables use stamped codes (`alue_23_…`). **This table still uses `Alue` and `Ammattiryhmä` as the variable `code`.** Do not rename them.

POST (SSS, occupation `2512`, `2026M07`, both contents) → **200**, `value`: **`[3772, 58]`** (unemployed 3772, vacancies 58). `updated`: `2026-08-25T05:00:00Z`. Note: `"... = Data is subject to secrecy"`.

This is a **tightness proxy** (unemployed vs vacancies), not an expert shortage/surplus grade.

License: same StatFin CC BY 4.0; cite Statistics Finland / KEHA as in the `source` field.

### 3.2 Työvoimabarometri (KEHA) — public UI JSON, unpublished as open data

| Page | HTTP | Notes |
|---|---|---|
| https://tyovoimabarometri.fi/ | 200 | Vite SPA, 674-byte shell, script `/assets/index-BJmwCnQL.js` |
| https://tyovoimabarometri.fi/ammatti | 200 | same shell |
| https://tyovoimabarometri.fi/api | **404** empty | |
| https://tyovoimabarometri.fi/openapi.json | **404** | no OpenAPI |
| https://ammattibarometri.fi/ | **timeout** (HTTP 000) | predecessor domain dead from this network |
| https://tem.fi/tyovoimabarometri | 200 | TEM page: KEHA owns barometer from March 2025; Ammattibarometri replaced autumn 2023; contact `tyovoimabarometri(at)keha-keskus.fi` |
| https://www.keha-keskus.fi/-/tyovoimabarometrin-kansallinen-koordinointi-ja-kehittamisvastuu-keha-keskukselle | 200 (search) | transfer 1.3.2025 |
| avoindata package_search työvoimabarometri / ammattibarometri | 200 | **0 datasets** |

Frontend Azure app: `app-tb-julkinen-web-prod-cissm2gvdg24m.azurewebsites.net`.  
API Azure app (from `Set-Cookie` Domain on 404s): `app-tb-julkinen-api-prod-cissm2gvdg24m.azurewebsites.net`.  
No licence / terms of use for this JSON were found on the pages fetched. **Not registered on avoindata.fi.** Treat as undocumented public UI API; confirm reuse with KEHA before production.

JS enum for `kohtaantotila` (client, matches numeric field below):

| value | name in bundle |
|---|---|
| 0 | `tasapainossa` |
| 1 | `ylitarjonta` |
| 2 | `kohtaantoOngelma` |
| 3 | `tyovoimaPula` |
| 99 | `laskentavirhe` |

`kohtaantoaste`: 1 `tasapaino`, 2 `lieva`, 3 `kohtalainen`, 4 `vakava`, 5 `halyttava`.

#### Endpoints actually called

| Method / URL | HTTP | Schema (actual keys) |
|---|---|---|
| `GET /api/ammatit` | **200** 100 167 B | array **420**, unique 4-digit `koodi`. Keys: `nimi`, `id` (uuid), `toimialaId`, `koodi`, `kaytossa`, `lokalisoidutNimet`, `uiNayttaa`, `tyopaikkaKerroin`. All `kaytossa=false`, all `lokalisoidutNimet=null`, all `tyopaikkaKerroin=null`. `2512` → `nimi` `Sovellussuunnittelijat`, `id` `dd1b7558-21fb-43a5-b07a-33bb01878cad` |
| `GET /api/Toimiala` | **200** | **9** groups. Keys: `nimi`, `toimialaId`, `koodi` (empty string), `kaytossa`, `uiNayttaa`, `lokalisoidutNimet`. `?lang=en` still returned Finnish `nimi` |
| `GET /api/Paikka` | **404** | need suffix |
| `GET /api/Paikka/regions` | **200** | **19** maakunnat. Keys: `id`, `koodi` (`01`…`21` official region numbers), `nimi`, `voimassaAlkaen`, `voimassaPaattyen` |
| `GET /api/Paikka/map` | **200** | GeoJSON `FeatureCollection` (ETRS-TM35FIN-like metre coordinates) |
| `GET /api/Tyollisyys/kohtaanto` | **404** | need suffix |
| `GET /api/Tyollisyys/kohtaanto/date` | **200** | `{"value":"2026-06","ennuste":false}` |
| `GET /api/Tyollisyys/kohtaanto/Ammatti/{ammattiId}/dates` | **200** | 42 objects `{value, ennuste}`; **2023-01 … 2026-06**; all `ennuste=false` for 2512 |
| `GET /api/Tyollisyys/kohtaanto/Ammatti/{ammattiId}/2026-06` | **200** | **19** rows (one per region). Keys: `groupingId`, `asteikko`, `kulmakerroin`, `tyottomyysaste`, `vakanssiaste`, `kohtaantotila`, `kohtaantoaste`, `tyottomat`, `tyottomatSensuroitu`, `toissa`, `toissaSensuroitu`, `tyopaikat`, `kohtaantoTime` |
| `GET /api/Tyollisyys/kohtaanto/Ammatti/{ammattiId}/ennuste` | **200** | `[]` empty list (no forecast rows for 2512 on this day) |
| `GET /api/ammatit/{ammattiId}` | **200** | list of **job titles** under the group, not the group itself. Keys: `nimi`, `kuvaus` (string[]), `osaaminen` (string[]), `tyomarkkinatoriLinkki`, `id`, `ammattiryhmaId`, `koodi`, `kaytossa`, `ammattitieto`, `tyomarkkinatoriUUID`, `tyomarkkinatoriAmmattikoodi`. For 2512 titles, `koodi`/`tyomarkkinatori*` were empty; `ammattitieto` null |
| `GET /api/ammatit/{ammattiId}/linkitetyt-osaamiset` | **200** | skills. Keys include `nimi`, `osaaminenId`, `kategoriaId`, `kaytossa`, `lokalisoidutNimet`, `luotu`, `muokattu`, … |

`groupingId` on kohtaanto rows **equals** `Paikka/regions.id` (19/19 overlap verified for 2512 / 2026-06).

Sample kohtaanto row (2512, 2026-06):

```json
{
  "groupingId": "0ba006ef-3d5f-40d2-8789-1378e8fcb7b0",
  "asteikko": 6.096,
  "kulmakerroin": 0.07185,
  "tyottomyysaste": 0.086,
  "vakanssiaste": 0.006,
  "kohtaantotila": 1,
  "kohtaantoaste": 3,
  "tyottomat": 224,
  "tyottomatSensuroitu": false,
  "toissa": 2380,
  "toissaSensuroitu": false,
  "tyopaikat": 15,
  "kohtaantoTime": "2026-06"
}
```

Bare `/api/Tyollisyys/kohtaanto/{uuid}` and `/api/Tyollisyys/kohtaanto/{uuid}/dates` without the `Ammatti` segment → **404**.

Locale: JS calls `includeLocale: true` on some fetches; `?lang=en` did not switch Toimiala names. Default `nimi` is Finnish.

#### Recommended fetch (scripts) — adapter, not an official open-data contract

```
GET https://tyovoimabarometri.fi/api/ammatit
GET https://tyovoimabarometri.fi/api/Paikka/regions
GET https://tyovoimabarometri.fi/api/Tyollisyys/kohtaanto/date
GET https://tyovoimabarometri.fi/api/Tyollisyys/kohtaanto/Ammatti/{id}/dates
GET https://tyovoimabarometri.fi/api/Tyollisyys/kohtaanto/Ammatti/{id}/{yyyy-mm}
```

Join: `ammatit.koodi` ↔ AML / StatFin 4-digit code; `kohtaanto.groupingId` ↔ `regions.id`.  
Cache `max-age=600` was sent on `/api/ammatit` and `/api/Toimiala`.  
**Do not treat this as a stable documented API.** Paths are reconstructed from the public JS bundle and verified by GET. Ask KEHA (`tyovoimabarometri@keha-keskus.fi`) for licence and stability. Fixture/snapshot the JSON if the UI API disappears.

**Gaps:** no OpenAPI; no avoindata dataset; no licence text found; `lokalisoidutNimet` null; `ennuste` empty for the tested occupation; expert “pula 2026” lists on the HTML homepage were not found as a separate list endpoint in this retrieval; 420 occupations only (4-digit, not 5-digit national splits).

### 3.3 Työmarkkinatori / Job Market Finland — job ads, not outlook

| Inspected | URL | HTTP |
|---|---|---|
| API index | https://tyomarkkinatori.fi/en/instructions-and-support/interfaces | 200 |
| Job posting APIs | https://tyomarkkinatori.fi/en/instructions-and-support/interfaces/interfaces-for-job-postings | 200 |
| Terms | https://tyomarkkinatori.fi/en/instructions-and-support/interfaces/interfaces-for-job-postings/terms-of-use-for-job-market-finlands-job-posting-apis | 200 |
| Search API PDF | https://tyomarkkinatori.fi/dam/jcr:94598382-8e5a-4111-b10a-f0dc17fd781c/Jobposting-seach-interface-(P67)---technical-documentation.pdf | fetched via search |
| Guessed public path `.../jobposting-new/v1/public/jobpostings` | **404 HTML** | |
| `https://api.ahtp.fi/kipa/p67/v2/jobpostings` unauthenticated | **timeout** (HTTP 000) | |

Documented facts (from those pages, not from a live authorised call):

- Import + retrieval APIs; access tied to **business ID**; KEHA activation form; credentials for test then production.
- Contact: `tmt-rajapinnat.keha@ely-keskus.fi`
- Production search (PDF): `https://api.ahtp.fi/kipa/p67/v2/jobpostings` via Kipa; header `KIPA-SubscriptionId`; NDJSON stream.
- Codesets mentioned in the PDF include occupation (`AMMATTI`) served from Job Market Finland’s codeset service (not called here — requires the same onboarding).
- Terms: cite source “Job Market Finland’s customer information system”; no third-party forwarding without permission; **cannot advertise a product based on the dataset without KEHA permission**.
- Jobseeker-profile export API “opens autumn 2026” (page dated 12.3.2026).
- Labour-market training retrieval API exists (REST, credentials); not occupation outlook.

**Not usable as the outlook source** without KEHA onboarding. Vacancies ≠ shortage grade.

---

## 4. Recommended pipeline for this product

| Need | Use | Adapter? |
|---|---|---|
| Codes + hierarchy + FI descriptions + FI/SV/EN names | StatFin classifications `ammatti_1_20100101` items, 3 langs | Small merge-on-`code` |
| Optional extra EN/SV labels in one file | koodistot `prefLabel` | Optional; older dump |
| Employed persons by occupation + year | StatFin `115q.px` (or `115r.px`) POST json-stat2 | PxWeb client; short ids + live variable codes |
| Optional 2024–2025 survey employed (2-digit) | `13au.px` | Separate series; units are 1000 persons |
| Official tightness (unemployed / vacancies) | StatFin `12ti.px` (KEHA) | Same PxWeb client; vars `Alue`, `Ammattiryhmä`, `timeperiod_m` |
| Expert kohtaanto / pula / ylitarjonta | Työvoimabarometri UI JSON `/api/ammatit` + `/api/Tyollisyys/kohtaanto/Ammatti/{id}/{yyyy-mm}` | **Yes** — undocumented; snapshot + KEHA permission |
| Job ads | TMT P67 | Out of scope unless onboarded |

**Join keys that were actually observed**

| Left | Right | Key |
|---|---|---|
| Classification `code` | `115q` `ammatti_104_20161021` | 4-digit / 5-digit **without** trailing `.` |
| Classification `code` | Barometer `ammatit.koodi` | 4-digit (420 codes) |
| Classification `code` | `12ti` `Ammattiryhmä` | 4-digit; ignore `X*` |
| Barometer `regions.id` | kohtaanto `groupingId` | UUID (verified equal set) |
| Barometer `regions.koodi` | `115s` `MK01`… | region numbers `01`…`21` vs `MK` prefix — **adapter** (`01` ↔ `MK01`) |

---

## 5. Gaps / unavailable fields

- No English (or verified Swedish) **occupation descriptions** on the StatFin classification API; FI notes only.
- No official **ISCO-08 correspondence map rows** retrieved (only AML 2001↔2010 metadata).
- Register employment by occupation ends at **2023**.
- No PxWeb v2, no PxGraf data API, no working classification CSV URL, no classification API swagger.
- **No avoindata dataset** for Työvoimabarometri or Ammattibarometri.
- Barometer API is **undocumented**; `ennuste` empty for tested occupation; titles under `/api/ammatit/{id}` do not carry AML codes.
- TMT job APIs are **credentialed**; unauthenticated production call timed out; guessed public path 404.
- `ammattibarometri.fi` timed out.
- Classification `search=` parameter does **not** filter.

---

## 6. Attribution snippets (from official terms)

- Statistics / classifications: “Source: Statistics Finland” + CC BY 4.0 + table or classification id + retrieval date **2026-08-29**.
- Employment service tables: `source` field says KEHA Centre, Employment Service Statistics (still served under StatFin licence page).
- TMT (if ever used): “Source: Job Market Finland’s customer information system” per TMT terms.
- Työvoimabarometri JSON: **no licence found** — do not assume CC BY.

---

## 7. Contact points (from the pages fetched)

| Topic | Address |
|---|---|
| StatFin / PxWeb | tietokannat@stat.fi |
| Työvoimabarometri | tyovoimabarometri@keha-keskus.fi (TEM page) |
| TMT job APIs | tmt-rajapinnat.keha@ely-keskus.fi |
| TMT training API | tmt-koulutustietorajapinta@keha-keskus.fi |
| koodistot / YTI | yhteentoimivuus@dvv.fi |
