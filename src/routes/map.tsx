import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { lazy, Suspense } from "react";
import { VillageTable } from "@/components/village-table";

const GujaratMap = lazy(() => import("@/components/gujarat-map").then((m) => ({ default: m.GujaratMap })));

export const Route = createFileRoute("/map")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Map · HydroMind AI" },
      { name: "description", content: "Interactive Gujarat heat map of groundwater risk." },
    ],
  }),
  component: MapPage,
});

function MapPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Risk Heat Map</h1>
        <p className="text-sm text-muted-foreground">Leaflet + OpenStreetMap. Marker size and color encode composite risk.</p>
      </div>
      <Card className="p-3">
        <Suspense fallback={<div className="h-[640px] animate-pulse rounded-md bg-muted" />}>
          <GujaratMap height={640} />
        </Suspense>
      </Card>
      <VillageTable />
    </div>
  );
}
