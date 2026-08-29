import { employmentRowSchema, type EmploymentRow } from "../schemas";
import { EMPLOYMENT_YEAR } from "./paths";

type JsonStat2 = {
  updated?: string;
  source?: string;
  value: Array<number | null>;
  dimension: {
    ammatti_104_20161021: {
      category: {
        index: Record<string, number>;
        label: Record<string, string>;
      };
    };
  };
  extension?: { px?: { tableid?: string } };
};

export const EMPLOYMENT_QUERY = {
  query: [
    {
      code: "ammatti_104_20161021",
      selection: { filter: "all" as const, values: ["*"] },
    },
    {
      code: "sukupuoli_9_20180101",
      selection: { filter: "item" as const, values: ["SSS"] },
    },
    {
      code: "ikaryhma_10_20180101",
      selection: { filter: "item" as const, values: ["SSS"] },
    },
    {
      code: "timeperiod_y",
      selection: { filter: "item" as const, values: [String(EMPLOYMENT_YEAR)] },
    },
    {
      code: "contentscode",
      selection: { filter: "item" as const, values: ["tyokay-tyolliset2"] },
    },
  ],
  response: { format: "json-stat2" as const },
};

export function parseEmploymentJsonStat(payload: unknown, year = EMPLOYMENT_YEAR): {
  rows: EmploymentRow[];
  updated: string | null;
  source: string | null;
  tableId: string | null;
} {
  const data = payload as JsonStat2;
  const index = data.dimension.ammatti_104_20161021.category.index;
  const labels = data.dimension.ammatti_104_20161021.category.label;
  const rows: EmploymentRow[] = [];

  for (const [code, position] of Object.entries(index)) {
    const value = data.value[position];
    if (value == null) continue;
    rows.push(
      employmentRowSchema.parse({
        occupationCode: code,
        label: labels[code] ?? code,
        employedPersons: value,
        year,
        isResidualPxCode: code.includes("."),
      }),
    );
  }

  return {
    rows,
    updated: data.updated ?? null,
    source: data.source ?? null,
    tableId: data.extension?.px?.tableid ?? "115r",
  };
}

export function employmentByExactCode(rows: EmploymentRow[]): Map<string, EmploymentRow> {
  return new Map(rows.filter((row) => !row.isResidualPxCode).map((row) => [row.occupationCode, row]));
}
