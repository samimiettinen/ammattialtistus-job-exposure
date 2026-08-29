import fs from "node:fs";
import path from "node:path";
import { fetchJson, mapPool, sleep } from "../src/lib/pipeline/http";
import {
  aggregateNationalOutlook,
  parseBarometerCatalog,
  parseBarometerRegions,
  parseKohtaantoRows,
} from "../src/lib/pipeline/outlook";
import {
  BAROMETER_AMMATIT_URL,
  BAROMETER_DATE_URL,
  BAROMETER_REGIONS_URL,
  OUTLOOK_PERIOD,
  RETRIEVED_AT,
  RAW_DIR,
  barometerObservationUrl,
  files,
} from "../src/lib/pipeline/paths";
import type { BarometerRegion, OutlookRecord } from "../src/lib/schemas";

type DatePayload = { value?: string; ennuste?: boolean };

async function main() {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  const catalog = parseBarometerCatalog(await fetchJson<unknown>(BAROMETER_AMMATIT_URL));
  fs.writeFileSync(files.barometerCatalog, JSON.stringify(catalog, null, 2));

  // Region names for the 19 maakunnat. `regions.id` is the join key for the
  // `groupingId` on every kohtaanto row; without it the regional rows have no
  // readable name, and a UUID is never presented as one.
  let regions: BarometerRegion[] = [];
  try {
    regions = parseBarometerRegions(await fetchJson<unknown>(BAROMETER_REGIONS_URL));
    fs.writeFileSync(files.barometerRegions, JSON.stringify(regions, null, 2));
  } catch (error) {
    console.warn("Could not read barometer regions; regional rows stay unnamed.", error);
  }

  let period = OUTLOOK_PERIOD;
  try {
    const latest = await fetchJson<DatePayload>(BAROMETER_DATE_URL);
    if (latest.value) period = latest.value;
  } catch (error) {
    console.warn("Could not read latest kohtaanto date, using", period, error);
  }

  const existing: OutlookRecord[] = fs.existsSync(files.outlookRaw)
    ? (JSON.parse(fs.readFileSync(files.outlookRaw, "utf8")).records ?? [])
    : [];
  const done = new Set(
    existing.filter((row) => row.period === period).map((row) => row.occupationCode),
  );

  const pending = catalog.filter((row) => !done.has(row.koodi));
  console.log(`Barometer occupations: ${catalog.length}. Cached for ${period}: ${done.size}. Fetching ${pending.length}.`);

  const records = [...existing.filter((row) => row.period === period)];
  const fetched = await mapPool(pending, 4, async (occupation, index) => {
    await sleep(80);
    const url = barometerObservationUrl(occupation.id, period);
    try {
      const regional = parseKohtaantoRows(await fetchJson<unknown>(url));
      const record = aggregateNationalOutlook({
        occupationCode: occupation.koodi,
        barometer: occupation,
        period,
        regional,
      });
      if ((index + 1) % 25 === 0) {
        console.log(`  ${index + 1}/${pending.length} ${occupation.koodi}`);
      }
      return record;
    } catch (error) {
      console.warn(`Skip ${occupation.koodi}:`, error);
      return aggregateNationalOutlook({
        occupationCode: occupation.koodi,
        barometer: occupation,
        period,
        regional: [],
      });
    }
  });

  records.push(...fetched);
  const byCode = new Map(records.map((row) => [row.occupationCode, row]));
  const unique = [...byCode.values()].sort((a, b) => a.occupationCode.localeCompare(b.occupationCode));

  const out = {
    retrievedAt: RETRIEVED_AT,
    period,
    catalogUrl: BAROMETER_AMMATIT_URL,
    regionsUrl: BAROMETER_REGIONS_URL,
    regions,
    observationUrlTemplate: barometerObservationUrl("{id}", period),
    aggregation:
      "Employment-weighted majority of regional kohtaantotila (toissa); signed kohtaantoaste mean. Not an official national KEHA index.",
    count: unique.length,
    records: unique,
  };
  fs.writeFileSync(files.outlookRaw, JSON.stringify(out, null, 2));
  console.log(`Wrote ${unique.length} outlook records → ${path.relative(process.cwd(), files.outlookRaw)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
