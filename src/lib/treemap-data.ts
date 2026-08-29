import { metricColor, outlookColor, scoreColor, type ColorMetric } from "./colors";
import { groupCodeAtLevel } from "./pipeline/classification";
import { isUnclassifiedOccupation } from "./occupation-view";
import type { Occupation } from "./schemas";
import { occupationName } from "./utils";

export type HierarchyLabel = {
  occupationCode: string;
  level: number;
  occupationNameFi: string;
  occupationNameSv: string;
  occupationNameEn: string;
};

export type TreemapLeafData = {
  name: string;
  value: number;
  code: string;
  occupation: true;
  itemStyle: { color: string; borderColor: string; borderWidth: number };
};

export type TreemapGroupData = {
  name: string;
  value: number;
  code: string;
  occupation: false;
  itemStyle: { color: string; borderColor: string; borderWidth: number };
  children: Array<TreemapGroupData | TreemapLeafData>;
};

export type TreemapNode = TreemapGroupData | TreemapLeafData;

const AVG_CHAR_EMPIRICAL = 0.62;
const LINE_HEIGHT = 1.25;
const LABEL_PAD = 8;

export function shouldShowTreemapLabel(
  label: string,
  width: number,
  height: number,
  fontSize = 11,
): boolean {
  if (!label.trim()) return false;
  const innerWidth = width - LABEL_PAD;
  const innerHeight = height - LABEL_PAD;
  const charWidth = fontSize * AVG_CHAR_EMPIRICAL;
  if (innerWidth < charWidth * 2 || innerHeight < fontSize) return false;
  const maxCharsPerLine = Math.max(1, Math.floor(innerWidth / charWidth));
  const maxLines = Math.max(0, Math.floor(innerHeight / (fontSize * LINE_HEIGHT)));
  if (maxLines < 1) return false;
  const requiredLines = Math.ceil(label.length / maxCharsPerLine);
  return requiredLines <= maxLines;
}

function labelName(node: HierarchyLabel | Occupation, locale: string): string {
  if ("occupationNameFi" in node) return occupationName(node, locale);
  return occupationName(node, locale);
}

function weightedScoreColor(rows: Occupation[], metric: ColorMetric): string {
  if (metric === "outlook") {
    const kinds = new Set(rows.map((row) => row.laborMarketOutlook));
    if (kinds.size === 1) return outlookColor(rows[0]?.laborMarketOutlook ?? "unavailable");
    return "#c5c1b7";
  }
  let weight = 0;
  let sum = 0;
  for (const row of rows) {
    const value = metric === "adoption" ? row.currentAIAdoption : row.theoreticalAIExposure;
    const employed = row.employedPersons ?? 0;
    if (value == null || employed <= 0) continue;
    sum += value * employed;
    weight += employed;
  }
  if (weight === 0) return scoreColor(null);
  return scoreColor(sum / weight);
}

function usefulLabel(code: string, name: string): string {
  return `${code} ${name}`.trim();
}

export function buildTreemapHierarchy(args: {
  occupations: Occupation[];
  hierarchy: HierarchyLabel[];
  locale: string;
  metric: ColorMetric;
  selectedCode: string;
}): TreemapNode[] {
  const classified = args.occupations.filter(
    (row) => (row.employedPersons ?? 0) > 0 && !isUnclassifiedOccupation(row),
  );
  const labels = new Map(args.hierarchy.map((row) => [row.occupationCode, row]));

  const nameOf = (code: string, fallback: string) => {
    const row = labels.get(code);
    return row ? labelName(row, args.locale) : fallback;
  };

  const groups1 = new Map<string, Occupation[]>();
  for (const row of classified) {
    const key = groupCodeAtLevel(row.occupationCode, 1);
    const list = groups1.get(key) ?? [];
    list.push(row);
    groups1.set(key, list);
  }

  const nodes: TreemapNode[] = [];
  for (const [major, majorRows] of [...groups1.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const groups2 = new Map<string, Occupation[]>();
    for (const row of majorRows) {
      const key = groupCodeAtLevel(row.occupationCode, 2);
      const list = groups2.get(key) ?? [];
      list.push(row);
      groups2.set(key, list);
    }

    const level2: TreemapGroupData[] = [];
    for (const [sub, subRows] of [...groups2.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const groups3 = new Map<string, Occupation[]>();
      for (const row of subRows) {
        const key = groupCodeAtLevel(row.occupationCode, 3);
        const list = groups3.get(key) ?? [];
        list.push(row);
        groups3.set(key, list);
      }

      const level3: TreemapGroupData[] = [];
      for (const [minor, minorRows] of [...groups3.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        const leaves: TreemapLeafData[] = minorRows
          .slice()
          .sort((a, b) => (b.employedPersons ?? 0) - (a.employedPersons ?? 0))
          .map((row) => ({
            name: usefulLabel(row.occupationCode, occupationName(row, args.locale)),
            value: row.employedPersons ?? 0,
            code: row.occupationCode,
            occupation: true as const,
            itemStyle: {
              color: metricColor(args.metric, row),
              borderColor: row.occupationCode === args.selectedCode ? "#1c2430" : "#f4f1ea",
              borderWidth: row.occupationCode === args.selectedCode ? 2 : 1,
            },
          }));
        const minorValue = leaves.reduce((sum, leaf) => sum + leaf.value, 0);
        level3.push({
          name: usefulLabel(minor, nameOf(minor, minor)),
          value: minorValue,
          code: minor,
          occupation: false,
          itemStyle: {
            color: weightedScoreColor(minorRows, args.metric),
            borderColor: "#f4f1ea",
            borderWidth: 1,
          },
          children: leaves,
        });
      }

      const subValue = level3.reduce((sum, node) => sum + node.value, 0);
      level2.push({
        name: usefulLabel(sub, nameOf(sub, sub)),
        value: subValue,
        code: sub,
        occupation: false,
        itemStyle: {
          color: weightedScoreColor(subRows, args.metric),
          borderColor: "#e7e2d8",
          borderWidth: 2,
        },
        children: level3,
      });
    }

    const majorValue = level2.reduce((sum, node) => sum + node.value, 0);
    nodes.push({
      name: usefulLabel(major, nameOf(major, majorRows[0]?.majorGroupName ?? major)),
      value: majorValue,
      code: major,
      occupation: false,
      itemStyle: {
        color: weightedScoreColor(majorRows, args.metric),
        borderColor: "#d8d2c6",
        borderWidth: 2,
      },
      children: level2,
    });
  }

  return nodes;
}
