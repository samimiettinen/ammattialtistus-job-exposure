import { Suspense } from "react";
import { Visualizer } from "@/components/Visualizer";
import { loadCatalog, visualOccupations } from "@/lib/catalog";

export default async function HomePage() {
  const catalog = loadCatalog();
  const occupations = visualOccupations(catalog.occupations);
  const groupMap = new Map<string, string>();
  for (const row of occupations) {
    groupMap.set(row.majorGroupCode, row.majorGroupName);
  }
  const groups = [...groupMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, name]) => ({ code, name }));

  return (
    <Suspense fallback={<p>Ladataan näkymää…</p>}>
      <Visualizer occupations={occupations} groups={groups} />
    </Suspense>
  );
}
