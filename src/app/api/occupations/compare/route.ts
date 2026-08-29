import { NextResponse } from "next/server";
import { loadCatalog, visualOccupations } from "@/lib/catalog";
import { buildComparisonView, resolveCompareOccupations } from "@/lib/comparison";
import { COMPARE_MAX, COMPARE_MIN, compareQuerySchema } from "@/lib/schemas/comparison";
import { occupationName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = compareQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query", details: parsed.error.flatten() }, { status: 400 });
  }

  const catalog = loadCatalog();
  const visual = visualOccupations(catalog.occupations);
  const resolved = resolveCompareOccupations(visual, parsed.data.codes.split(","));
  if (resolved.requested.length < COMPARE_MIN || resolved.requested.length > COMPARE_MAX) {
    return NextResponse.json(
      { error: "Compare 2–4 classified level-4 occupation codes", requested: resolved.requested },
      { status: 400 },
    );
  }

  const locale = url.searchParams.get("locale") === "sv" || url.searchParams.get("locale") === "en"
    ? url.searchParams.get("locale")!
    : "fi";
  const unavailable =
    locale === "sv" ? "Uppgift saknas" : locale === "en" ? "Information not available" : "Tietoa ei saatavilla";
  const outlookLabels: Record<string, Record<string, string>> = {
    fi: {
      shortage: "Työvoimapula",
      surplus: "Ylitarjonta",
      balanced: "Tasapaino",
      mismatch: "Kohtaanto-ongelma",
      unavailable,
    },
    sv: {
      shortage: "Arbetskraftsbrist",
      surplus: "Överskott",
      balanced: "Balans",
      mismatch: "Matchningsproblem",
      unavailable,
    },
    en: {
      shortage: "Shortage",
      surplus: "Surplus",
      balanced: "Balanced",
      mismatch: "Mismatch",
      unavailable,
    },
  };
  const uncertaintyLabels: Record<string, Record<string, string>> = {
    fi: { low: "Matala", medium: "Keskitaso", high: "Korkea" },
    sv: { low: "Låg", medium: "Medel", high: "Hög" },
    en: { low: "Low", medium: "Medium", high: "High" },
  };

  const view = buildComparisonView({
    catalog: visual,
    codes: resolved.requested,
    locale,
    nameOf: (occupation) => occupationName(occupation, locale),
    unavailable,
    outlookLabel: (outlook) => outlookLabels[locale]?.[outlook] ?? unavailable,
    uncertaintyLabel: (value) => uncertaintyLabels[locale]?.[value] ?? value,
  });

  return NextResponse.json({
    retrievedAt: catalog.retrievedAt,
    provenance: catalog.provenance,
    requested: view.requested,
    missing: view.missing,
    occupations: resolved.occupations,
    comparison: view.columns,
  });
}
