# Curated golden sets — a third data class

**Date:** 2026-08-31
**Status:** first increment. One profile, unvalidated draft.

Ammattialtistus has always kept two data classes visibly apart: official statistics and AI estimates. Curated golden sets are a **third**, and the most dangerous of the three, because they read as authoritative while resting on no statistical source. Everything below exists to keep that honest.

## What a curated profile is, and is not

A profile is a hand-written set of task cards for a way of working — "tekoälyä käyttävä koodari" — not for an occupation. It **spans several AML 2010 codes** with primary/secondary strength and never shadows or overwrites an occupation record.

| Not this | But this |
|---|---|
| An official statistic | An editorial expert assessment, labelled as one |
| An LLM output | Hand-written, with a named panel that will score it |
| A replacement for the catalog's 0–10 exposure scores | A separate grain that never feeds into them |
| A career-change recommendation | Task-level description, kept out of the deterministic situation card |

## The two axes

Every card carries `aiAssistance` and `humanCriticality`, each 1–5, **each with its own written reasoning**. The source material states the rule and the schema enforces it:

> Akselit ovat riippumattomia. Sama tehtävä voi olla korkea molemmilla.

Neither axis is derived from the other and the UI never renders them as two ends of one scale. This is the product's whole thesis expressed at task level: AI can accelerate a task *and* a person still carries it. `tests/curated.test.ts` asserts that cards high on both actually exist, so the shape cannot quietly collapse into a single risk number.

`aiAssistance` additionally carries **its own review date**, because tool capability moves faster than the rest of the card. Past the profile's `aiReviewIntervalMonths` the axis renders as stale — the same treatment `employmentStale` and `outlookStale` already give official figures. An axis with no value is *unavailable*, not stale, and never zero.

## Draft versus validated

A profile or card is validated only when `status === "panel_reviewed"` **and** `validatedBy >= 1`. Anything else is a draft and is tagged *Kuratoitu luonnos, ei validoitu*.

`curatedIntegrityErrors` refuses:

- `panel_reviewed` with no reviewer, or with no `reviewedAt`
- a score with no stated reason — an unsupported assertion is exactly what this class must never ship
- a duplicate `taskId`, or a card in an unknown module
- a US occupational-classification host in a renderable source

## Sources

`sources` are renderable. `researchOnlyRefs` are not, and exist so O*NET/SOC provenance can be retained honestly for editors without reaching the UI — the product rule forbids presenting US classifications as a description of the Finnish labour market.

A `site`-precision reference is also kept out of the rendered list. The developer set's own critique log flagged that its ESCO reference is front-page only with no per-occupation URI; presenting it as an anchor would repeat that weakness instead of recording it. The UI says so rather than showing nothing.

Resolving occupation-level ESCO URIs needs network access to `esco.ec.europa.eu`, which this development environment blocks.

## Where it renders, and why not in the situation card

Curated content gets **its own surface** in the detail panel. The deterministic analysis caps next actions at three from five allowed kinds and forbids generic reskilling catalogues (`docs/SAMANTHA_ANALYSIS_AUDIT.md` §2.5). Folding a curated programme in would either break that cap or gut the content, and would make the "exposure alone never triggers a career-change category" gate harder to audit. Curated adjacency likewise cannot pass through `careerBridgeSchema`, which hard-locks `kind: "calculated"`.

Core tasks render open; path modules collapse, because opening all 24 cards at once buries the reader. The guided form in a later increment will select core + one path.

## Adding a profile

1. Write `data/curated/<profile-id>.json` against `curatedProfileSchema` (`src/lib/schemas/curated.ts`).
2. Anchor it to AML codes that exist in the catalog. One `primary`, the rest `secondary`.
3. Reuse `SKILL_TAXONOMY` ids where a skill already exists; do not start a second vocabulary.
4. Leave unknown axes `null`. **Do not invent a score to fill a gap** — the coverage report exists to show the gap.
5. Run `npm run pipeline:07`.

## Current content

| Profile | Cards | Both axes | Panel-reviewed |
|---|---|---|---|
| `ai-assisted-developer` | 24 (6 core + 4 + 4 + 4 + 3 + 3) | 24 | 0 |

Lawyer and investment banker are not yet present: the available material is a task list and a structure, not scored cards. They land when content exists, not before.
