import { MapContainer, TileLayer, CircleMarker, Tooltip, ZoomControl } from "react-leaflet";
import { riskLevel, villages as mockVillages } from "@/lib/mock-data";
import { api } from "@/lib/api/client";
import { useQuery } from "@tanstack/react-query";

const colorFor = (score: number) => {
  const lvl = riskLevel(score);
  if (lvl === "critical") return "oklch(0.58 0.22 27)";
  if (lvl === "warning") return "oklch(0.78 0.16 75)";
  return "oklch(0.65 0.16 145)";
};

export function GujaratMap({ height = 480, search = "", onSelect }: { height?: number; search?: string; onSelect?: (district: any) => void }) {
  const { data: districts = [] } = useQuery({
    queryKey: ["districtMapData"],
    queryFn: async () => {
      const res = await fetch("http://127.0.0.1:8000/api/analysis/districts/map");
      if (!res.ok) throw new Error("Failed to fetch map data");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const q = search.toLowerCase().trim();
  const filteredDistricts = districts.filter((d: any) => {
    if (!q) return true;
    return d.name.toLowerCase().includes(q);
  });

  return (
    <div className="overflow-hidden rounded-md border border-border" style={{ height }}>
      <MapContainer
        center={[23.4, 71.8]}
        zoom={7}
        zoomControl={false}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <ZoomControl position="topright" />
        {filteredDistricts.map((d: any) => (
          <CircleMarker
            key={d.id}
            center={[d.lat, d.lng]}
            radius={8 + d.riskScore / 12}
            eventHandlers={{ click: () => onSelect?.(d) }}
            pathOptions={{
              color: colorFor(d.riskScore),
              fillColor: colorFor(d.riskScore),
              fillOpacity: 0.55,
              weight: 2,
            }}
          >
            <Tooltip direction="top" offset={[0, -4]} opacity={1}>
              <div className="text-xs">
                <div className="font-semibold text-sm">{d.name}</div>
                <div className="text-muted-foreground mb-1">{d.category}</div>
                <div>Stage of Extraction: <span className="font-medium text-destructive">{d.stagePct.toFixed(1)}%</span></div>
                <div>Avg Water Level: <span className="font-medium">{Math.abs(d.waterLevel).toFixed(1)} m bgl</span></div>
              </div>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
