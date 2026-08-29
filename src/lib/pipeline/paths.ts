import path from "node:path";

export const ROOT = process.cwd();
export const DATA_DIR = path.join(ROOT, "data");
export const RAW_DIR = path.join(DATA_DIR, "raw");
export const FIXTURE_DIR = path.join(DATA_DIR, "fixtures");

export const files = {
  occupationsRaw: path.join(RAW_DIR, "occupations_aml2010.json"),
  employmentRaw: path.join(RAW_DIR, "employment_115r_2023.json"),
  outlookRaw: path.join(RAW_DIR, "outlook_tyovoimabarometri_2026-06.json"),
  barometerCatalog: path.join(RAW_DIR, "tyovoimabarometri_ammatit.json"),
  barometerRegions: path.join(RAW_DIR, "tyovoimabarometri_maakunnat.json"),
  scoresDb: path.join(DATA_DIR, "scores.db"),
  scoresFixture: path.join(FIXTURE_DIR, "scores.json"),
  outlookFixture: path.join(FIXTURE_DIR, "outlook_adapter.example.json"),
  occupationsJson: path.join(DATA_DIR, "occupations.json"),
  validationReport: path.join(DATA_DIR, "validation-report.json"),
};

export const RETRIEVED_AT = "2026-08-29";
export const EMPLOYMENT_YEAR = 2023;
export const OUTLOOK_PERIOD = "2026-06";

export const CLASSIFICATION_LOCAL_ID = "ammatti_1_20100101";
export const CLASSIFICATION_ITEMS_URL =
  "https://data.stat.fi/api/classifications/v2/classifications/ammatti_1_20100101/classificationItems";
export const EMPLOYMENT_PX_URL = "https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/tyokay/115r.px";
export const BAROMETER_AMMATIT_URL = "https://tyovoimabarometri.fi/api/ammatit";
export const BAROMETER_DATE_URL = "https://tyovoimabarometri.fi/api/Tyollisyys/kohtaanto/date";
export const BAROMETER_REGIONS_URL = "https://tyovoimabarometri.fi/api/Paikka/regions";
export const barometerObservationUrl = (id: string, period: string) =>
  `https://tyovoimabarometri.fi/api/Tyollisyys/kohtaanto/Ammatti/${id}/${period}`;

export const SOURCE_URLS = [
  "https://data.stat.fi/api/classifications/v2/classifications/ammatti_1_20100101/classificationItems",
  "https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/tyokay/115r.px",
  "https://stat.fi/en/luokitukset/ammatti/ammatti_1_20100101",
  "https://stat.fi/tilasto/dokumentaatio/tyokay",
  "https://tyovoimabarometri.fi/api/ammatit",
  "https://tyovoimabarometri.fi",
] as const;
