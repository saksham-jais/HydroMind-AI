import { MapContainer, TileLayer, CircleMarker, Tooltip, ZoomControl } from "react-leaflet";
import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "@/lib/api/client";

/** Shared colour logic — identical to /map page */
const colorFor = (riskScore: number, category: string) => {
  if (category === "Over-Exploited" || riskScore >= 85)
    return { fill: "oklch(0.58 0.22 27)", stroke: "oklch(0.45 0.22 27)" };
  if (category === "Critical" || riskScore >= 70)
    return { fill: "oklch(0.65 0.18 45)", stroke: "oklch(0.50 0.18 45)" };
  if (category === "Semi-Critical" || riskScore >= 50)
    return { fill: "oklch(0.78 0.16 75)", stroke: "oklch(0.62 0.16 75)" };
  return { fill: "oklch(0.65 0.16 145)", stroke: "oklch(0.50 0.16 145)" };
};

export function GujaratMap({
  height = 480,
  search = "",
  onSelect,
}: {
  height?: number;
  search?: string;
  onSelect?: (district: any) => void;
}) {
  /**
   * Use the SAME endpoint as /map and /predictions so colours, risk scores,
   * and categories are 100% consistent across every page.
   */
  const { data: districts = [] } = useQuery({
    queryKey: ["districtMapData"],  // same key as /map page → shared cache
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/analysis/districts/forecast-year?year=2026`);
      if (!res.ok) throw new Error("Failed to fetch map data");
      return res.json();
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const q = search.toLowerCase().trim();
  const filtered = q
    ? districts.filter((d: any) => d.name.toLowerCase().includes(q))
    : districts;

  return (
    <div className="overflow-hidden rounded-md border border-border" style={{ height }}>
      <MapContainer
        center={[23.0, 71.5]}
        zoom={7}
        zoomControl={false}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <ZoomControl position="topright" />

        {filtered.map((d: any) => {
          const colors = colorFor(d.riskScore, d.category);
          const radius = 7 + d.riskScore / 12;

          return (
            <CircleMarker
              key={d.id ?? d.name}
              center={[d.lat, d.lng]}
              radius={radius}
              eventHandlers={{ click: () => onSelect?.(d) }}
              pathOptions={{
                color: colors.stroke,
                fillColor: colors.fill,
                fillOpacity: 0.72,
                weight: 2,
              }}
            >
              <Tooltip direction="top" offset={[0, -4]} opacity={1}>
                <div className="min-w-[150px] text-xs">
                  <div className="mb-1 font-semibold text-sm">{d.name}</div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-muted-foreground">
                    <span>Depth 2026</span>
                    <span className="font-medium text-foreground">
                      {(d.predictedDepth_m * 3.28084).toFixed(1)} ft bgl
                    </span>
                    <span>Risk Score</span>
                    <span className="font-medium text-foreground">
                      {Math.round(d.riskScore)}%
                    </span>
                    <span>Status</span>
                    <span
                      className={`font-medium ${
                        d.category === "Over-Exploited"
                          ? "text-red-500"
                          : d.category === "Critical"
                          ? "text-orange-500"
                          : d.category === "Semi-Critical"
                          ? "text-yellow-500"
                          : "text-green-500"
                      }`}
                    >
                      {d.category}
                    </span>
                    {d.annualDeclineRate_m > 0 && (
                      <>
                        <span>Decline</span>
                        <span className="font-medium text-foreground">
                          +{(d.annualDeclineRate_m * 3.28084).toFixed(2)} ft/yr
                        </span>
                      </>
                    )}
                  </div>
                  <div className="mt-1.5 text-[9px] text-muted-foreground">
                    Click to inspect district →
                  </div>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
