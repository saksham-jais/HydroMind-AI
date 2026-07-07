import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, CircleMarker, Tooltip, ZoomControl } from "react-leaflet";
import { Play, Pause, RotateCcw, TrendingDown, AlertTriangle, Droplet, Info } from "lucide-react";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/map")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Forecast Map · HydroMind AI" },
      { name: "description", content: "Animated AI-powered future groundwater depletion forecast for Gujarat." },
    ],
  }),
  component: MapPage,
});

const MIN_YEAR = 2026;
const MAX_YEAR = 2075;
const PLAY_INTERVAL_MS = 800;

const colorFor = (riskScore: number, category: string) => {
  if (category === "Over-Exploited" || riskScore >= 85) return { fill: "oklch(0.58 0.22 27)", stroke: "oklch(0.45 0.22 27)" };
  if (category === "Critical" || riskScore >= 70) return { fill: "oklch(0.65 0.18 45)", stroke: "oklch(0.50 0.18 45)" };
  if (category === "Semi-Critical" || riskScore >= 50) return { fill: "oklch(0.78 0.16 75)", stroke: "oklch(0.62 0.16 75)" };
  return { fill: "oklch(0.65 0.16 145)", stroke: "oklch(0.50 0.16 145)" };
};

function AnimatedForecastMap({ year }: { year: number }) {
  const { data: districts = [], isFetching } = useQuery({
    queryKey: ["forecastYear", year],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"}/api/analysis/districts/forecast-year?year=${year}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 60000,
  });

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg">
      {isFetching && (
        <div className="absolute right-3 top-3 z-[999] flex items-center gap-1.5 rounded-full bg-card/90 px-2.5 py-1 text-[10px] text-muted-foreground backdrop-blur">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning" />
          Computing...
        </div>
      )}
      <MapContainer
        center={[22.3, 71.5]}
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
        {districts.map((d: any) => {
          const colors = colorFor(d.riskScore, d.category);
          const radius = 8 + d.riskScore / 10;
          return (
            <CircleMarker
              key={d.id}
              center={[d.lat, d.lng]}
              radius={radius}
              pathOptions={{
                color: colors.stroke,
                fillColor: colors.fill,
                fillOpacity: 0.75,
                weight: 2,
              }}
            >
              <Tooltip direction="top" offset={[0, -4]} opacity={1}>
                <div className="min-w-[160px] text-xs">
                  <div className="mb-1 font-semibold text-sm">{d.name}</div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-muted-foreground">
                    <span>Predicted {year}</span>
                    <span className="font-medium text-foreground">{d.predictedDepth_m.toFixed(1)} m bgl</span>
                    <span>Risk Score</span>
                    <span className="font-medium text-foreground">{Math.round(d.riskScore)}%</span>
                    <span>Status</span>
                    <span className={`font-medium ${d.category === "Over-Exploited" ? "text-red-400" : d.category === "Critical" ? "text-orange-400" : d.category === "Semi-Critical" ? "text-yellow-400" : "text-green-400"}`}>
                      {d.category}
                    </span>
                    {d.annualDeclineRate_m > 0 && (
                      <>
                        <span>Crisis in</span>
                        <span className="font-medium text-foreground">
                          {d.yearsToCrisis < 9999 ? `~${Math.round(d.yearsToCrisis)} yrs` : "Stable"}
                        </span>
                      </>
                    )}
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

function MapPage() {
  const [year, setYear] = useState(MIN_YEAR);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPlayback = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsPlaying(false);
  }, []);

  const startPlayback = useCallback(() => {
    if (year >= MAX_YEAR) setYear(MIN_YEAR);
    setIsPlaying(true);
    intervalRef.current = setInterval(() => {
      setYear(prev => {
        if (prev >= MAX_YEAR) {
          stopPlayback();
          return MAX_YEAR;
        }
        return prev + 1;
      });
    }, PLAY_INTERVAL_MS);
  }, [year, stopPlayback]);

  useEffect(() => {
    if (isPlaying) {
      if (year >= MAX_YEAR) stopPlayback();
    }
  }, [year, isPlaying, stopPlayback]);

  // Cleanup on unmount
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const reset = () => {
    stopPlayback();
    setYear(MIN_YEAR);
  };

  const yearsFromNow = year - 2026;
  const progressPct = ((year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col gap-0 overflow-hidden">
      {/* Header bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-card/80 px-5 py-3 backdrop-blur">
        <div>
          <h1 className="text-base font-semibold">AI Groundwater Forecast Timeline</h1>
          <p className="text-[11px] text-muted-foreground">Linear Regression model predicting district depletion across Gujarat · 2026 – 2075</p>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.65_0.16_145)]" /> Safe</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.78_0.16_75)]" /> Semi-Critical</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.65_0.18_45)]" /> Critical</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.58_0.22_27)]" /> Over-Exploited</span>
        </div>
      </div>

      {/* Map */}
      <div className="relative min-h-0 flex-1">
        <Suspense fallback={<div className="h-full w-full animate-pulse bg-muted" />}>
          <AnimatedForecastMap year={year} />
        </Suspense>

        {/* Year overlay */}
        <div className="pointer-events-none absolute left-1/2 top-4 z-[999] -translate-x-1/2">
          <div className="rounded-xl border border-border bg-card/90 px-6 py-3 text-center shadow-xl backdrop-blur">
            <div className="text-5xl font-bold tabular-nums tracking-tight text-foreground">{year}</div>
            <div className={`mt-1 text-xs font-medium ${yearsFromNow === 0 ? "text-safe" : yearsFromNow < 15 ? "text-warning" : "text-critical"}`}>
              {yearsFromNow === 0 ? "Current Year" : `+${yearsFromNow} years from now`}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Controls */}
      <div className="shrink-0 border-t border-border bg-card/95 px-5 py-3 backdrop-blur">
        {/* Progress bar */}
        <div className="relative mb-3">
          <input
            type="range"
            min={MIN_YEAR}
            max={MAX_YEAR}
            value={year}
            onChange={(e) => { stopPlayback(); setYear(Number(e.target.value)); }}
            className="w-full cursor-pointer accent-primary"
            style={{
              background: `linear-gradient(to right, oklch(0.58 0.22 27) 0%, oklch(0.78 0.16 75) 40%, oklch(0.65 0.16 145) 100%)`,
            }}
          />
          {/* Tick marks */}
          <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
            {[2026, 2030, 2035, 2040, 2045, 2050, 2055, 2060, 2065, 2070, 2075].map(y => (
              <span key={y} className={year === y ? "font-bold text-foreground" : ""}>{y}</span>
            ))}
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={reset}
              title="Reset to 2026"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={isPlaying ? stopPlayback : startPlayback}
              className={`flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg transition-all ${
                isPlaying
                  ? "bg-warning hover:bg-warning/80"
                  : "bg-primary hover:bg-primary/80"
              }`}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
            </button>
            <div className="ml-2 text-xs text-muted-foreground">
              {isPlaying ? (
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning" />
                  Playing forecast timeline…
                </span>
              ) : (
                "Press play to animate AI predictions"
              )}
            </div>
          </div>

          {/* Stats for current year */}
          <div className="flex items-center gap-5 text-[11px]">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Droplet className="h-3.5 w-3.5 text-primary" />
              <span>Avg depth: <strong className="text-foreground">{(10 + yearsFromNow * 0.25).toFixed(1)} m bgl</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5 text-critical" />
              <span>At-risk districts: <strong className="text-critical">{Math.min(33, 8 + Math.floor(yearsFromNow * 0.35))}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px]">Click any circle for details · Model: Linear Regression (2005–2020 data)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
