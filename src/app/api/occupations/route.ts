import { NextResponse } from "next/server";
import { loadCatalog, visualOccupations } from "@/lib/catalog";
import { filterOccupations } from "@/lib/pipeline/filters";
import { occupationQuerySchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = occupationQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query", details: parsed.error.flatten() }, { status: 400 });
  }

  const catalog = loadCatalog();
  const query = {
    ...parsed.data,
    level: parsed.data.level ?? 4,
    scoreStatus: parsed.data.scoreStatus,
  };
  const rows = filterOccupations(visualOccupations(catalog.occupations), query);

  return NextResponse.json({
    retrievedAt: catalog.retrievedAt,
    provenance: catalog.provenance,
    total: visualOccupations(catalog.occupations).length,
    count: rows.length,
    occupations: rows,
  });
}
