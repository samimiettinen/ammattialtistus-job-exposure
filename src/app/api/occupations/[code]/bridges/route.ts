import { NextResponse } from "next/server";
import { buildCareerBridges } from "@/lib/bridges";
import { loadCatalog, visualOccupations } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const catalog = loadCatalog();
  const visual = visualOccupations(catalog.occupations);
  const source = visual.find((row) => row.occupationCode === code);
  if (!source) {
    return NextResponse.json({ error: "not_found", code }, { status: 404 });
  }
  return NextResponse.json(buildCareerBridges(source, visual));
}
