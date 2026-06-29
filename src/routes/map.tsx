import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { lazy, Suspense, useState } from "react";
import { VillageTable } from "@/components/village-table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

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
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Risk Heat Map</h1>
          <p className="text-sm text-muted-foreground">Leaflet + OpenStreetMap. Marker size and color encode composite risk.</p>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search village or ID..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      <Card className="p-3">
        <Suspense fallback={<div className="h-[640px] animate-pulse rounded-md bg-muted" />}>
          <GujaratMap height={640} search={searchQuery} />
        </Suspense>
      </Card>
      <VillageTable search={searchQuery} />
    </div>
  );
}
