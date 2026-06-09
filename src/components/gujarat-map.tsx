import { MapContainer, TileLayer, CircleMarker, Tooltip, ZoomControl } from "react-leaflet";
import { villages, riskLevel } from "@/lib/mock-data";

const colorFor = (score: number) => {
  const lvl = riskLevel(score);
  if (lvl === "critical") return "oklch(0.58 0.22 27)";
  if (lvl === "warning") return "oklch(0.78 0.16 75)";
  return "oklch(0.65 0.16 145)";
};

export function GujaratMap({ height = 480 }: { height?: number }) {
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
        {villages.map((v) => (
          <CircleMarker
            key={v.id}
            center={[v.lat, v.lng]}
            radius={8 + v.riskScore / 12}
            pathOptions={{
              color: colorFor(v.riskScore),
              fillColor: colorFor(v.riskScore),
              fillOpacity: 0.55,
              weight: 2,
            }}
          >
            <Tooltip direction="top" offset={[0, -4]} opacity={1}>
              <div className="text-xs">
                <div className="font-semibold">{v.name}</div>
                <div className="text-muted-foreground">{v.district}</div>
                <div>Risk: <span className="font-medium">{v.riskScore}%</span></div>
                <div>Level: {v.waterLevel} ft</div>
              </div>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
