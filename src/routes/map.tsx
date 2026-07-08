import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, CircleMarker, Tooltip, ZoomControl } from "react-leaflet";
import { Play, Pause, RotateCcw, TrendingDown, AlertTriangle, Droplet, Info, Database, Brain } from "lucide-react";
import { API_BASE } from "@/lib/api/client";

export const Route = createFileRoute("/map")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Forecast Map · HydroMind AI" },
      { name: "description", content: "Historical & AI-forecast groundwater timeline for Gujarat, 1991–2075." },
    ],
  }),
  component: MapPage,
});

// ── Constants ─────────────────────────────────────────────────────────
const HIST_START = 1991;
const HIST_END   = 2020;
const FORE_START = 2021;
const FORE_END   = 2075;
const MIN_YEAR   = HIST_START;
const MAX_YEAR   = FORE_END;
const PLAY_INTERVAL_MS = 700;

// Decade ticks for the timeline
const TICK_YEARS = [1991, 2000, 2010, 2020, 2030, 2040, 2050, 2060, 2075];

const colorFor = (riskScore: number, category: string) => {
  if (category === "Over-Exploited" || riskScore >= 85)
    return { fill: "oklch(0.58 0.22 27)", stroke: "oklch(0.45 0.22 27)" };
  if (category === "Critical" || riskScore >= 70)
    return { fill: "oklch(0.65 0.18 45)", stroke: "oklch(0.50 0.18 45)" };
  if (category === "Semi-Critical" || riskScore >= 50)
    return { fill: "oklch(0.78 0.16 75)", stroke: "oklch(0.62 0.16 75)" };
  return { fill: "oklch(0.65 0.16 145)", stroke: "oklch(0.50 0.16 145)" };
};

// ── Map layer ─────────────────────────────────────────────────────────
function DistrictMapLayer({ year }: { year: number }) {
  const isHistorical = year <= HIST_END;

  const { data: districts = [], isFetching } = useQuery({
    queryKey: [isHistorical ? "historicalYear" : "forecastYear", year],
    queryFn: async () => {
      const endpoint = isHistorical
        ? `${API_BASE}/analysis/districts/historical-year?year=${year}`
        : `${API_BASE}/analysis/districts/forecast-year?year=${year}`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 120_000,
  });

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg">
      {isFetching && (
        <div className="absolute right-3 top-3 z-[999] flex items-center gap-1.5 rounded-full bg-card/90 px-2.5 py-1 text-[10px] text-muted-foreground backdrop-blur">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          {isHistorical ? "Loading CSV data…" : "Computing forecast…"}
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
          const radius = 7 + d.riskScore / 12;
          return (
            <CircleMarker
              key={d.id}
              center={[d.lat, d.lng]}
              radius={radius}
              pathOptions={{
                color: colors.stroke,
                fillColor: colors.fill,
                fillOpacity: 0.8,
                weight: 1.5,
              }}
            >
              <Tooltip direction="top" offset={[0, -4]} opacity={1}>
                <div className="min-w-[180px] text-xs">
                  <div className="mb-1.5 font-bold text-sm">{d.name}</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-muted-foreground">
                    <span>{isHistorical ? "Recorded" : "Predicted"} {year}</span>
                    <span className="font-semibold text-foreground">{d.predictedDepth_m.toFixed(1)} m bgl</span>
                    <span>Risk Score</span>
                    <span className="font-semibold text-foreground">{Math.round(d.riskScore)}%</span>
                    <span>Status</span>
                    <span className={`font-semibold ${
                      d.category === "Over-Exploited" ? "text-red-400"
                      : d.category === "Critical" ? "text-orange-400"
                      : d.category === "Semi-Critical" ? "text-yellow-400"
                      : "text-green-400"
                    }`}>{d.category}</span>
                    <span>Source</span>
                    <span className="font-semibold text-foreground">
                      {isHistorical ? "📊 CSV Data" : "🤖 ML Model"}
                    </span>
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

// ── Main Page ─────────────────────────────────────────────────────────
function MapPage() {
  const [year, setYear] = useState(2000);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isHistorical = year <= HIST_END;

  const stopPlayback = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsPlaying(false);
  }, []);

  const startPlayback = useCallback(() => {
    if (year >= MAX_YEAR) setYear(MIN_YEAR);
    setIsPlaying(true);
    intervalRef.current = setInterval(() => {
      setYear(prev => {
        if (prev >= MAX_YEAR) { stopPlayback(); return MAX_YEAR; }
        return prev + 1;
      });
    }, PLAY_INTERVAL_MS);
  }, [year, stopPlayback]);

  useEffect(() => {
    if (isPlaying && year >= MAX_YEAR) stopPlayback();
  }, [year, isPlaying, stopPlayback]);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const reset = () => { stopPlayback(); setYear(HIST_START); };

  // Progress calculations
  const totalSpan = MAX_YEAR - MIN_YEAR;
  const histSpan  = HIST_END - MIN_YEAR;
  const histPct   = (histSpan / totalSpan) * 100;
  const progressPct = ((year - MIN_YEAR) / totalSpan) * 100;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden bg-background">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-card/80 px-5 py-3 backdrop-blur">
        <div>
          <h1 className="text-base font-semibold">Gujarat Groundwater Timeline</h1>
          <p className="text-[11px] text-muted-foreground">
            Historical CGWB CSV data (1991–2020) · ML Linear Regression forecast (2021–2075)
          </p>
        </div>
        {/* Mode badge */}
        <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all ${
          isHistorical
            ? "bg-primary/20 text-primary"
            : "bg-orange-500/20 text-orange-400"
        }`}>
          {isHistorical
            ? <><Database className="h-3 w-3" /> Historical CSV Data</>
            : <><Brain className="h-3 w-3" /> ML Forecast</>
          }
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.65_0.16_145)]" /> Safe</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.78_0.16_75)]" /> Semi-Critical</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.65_0.18_45)]" /> Critical</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.58_0.22_27)]" /> Over-Exploited</span>
        </div>
      </div>

      {/* ── Map ────────────────────────────────────────────────────── */}
      <div className="relative min-h-0 flex-1">
        <Suspense fallback={<div className="h-full w-full animate-pulse bg-muted" />}>
          <DistrictMapLayer year={year} />
        </Suspense>

        {/* Year overlay */}
        <div className="pointer-events-none absolute left-1/2 top-4 z-[999] -translate-x-1/2">
          <div className={`rounded-xl border px-6 py-3 text-center shadow-xl backdrop-blur transition-colors ${
            isHistorical
              ? "border-primary/30 bg-card/90"
              : "border-orange-500/30 bg-card/90"
          }`}>
            <div className="text-5xl font-bold tabular-nums tracking-tight">{year}</div>
            <div className={`mt-1 text-xs font-medium ${isHistorical ? "text-primary" : "text-orange-400"}`}>
              {isHistorical ? "📊 Recorded Data" : `🤖 AI Forecast · +${year - 2026} yrs`}
            </div>
          </div>
        </div>
      </div>

      {/* ── Timeline Controls ──────────────────────────────────────── */}
      <div className="shrink-0 border-t border-border bg-card/95 px-5 py-4 backdrop-blur">

        {/* Timeline track with dual zones */}
        <div className="relative mb-1">
          {/* Background track: historical vs forecast */}
          <div className="absolute inset-y-0 left-0 h-full w-full pointer-events-none" style={{ top: "50%", transform: "translateY(-50%)", height: "6px", borderRadius: "4px" }}>
            <div className="h-full w-full rounded overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-primary/60 to-primary/30"
                style={{ width: `${histPct}%` }}
              />
              <div
                className="h-full bg-gradient-to-r from-orange-600/50 to-red-700/50"
                style={{ width: `${100 - histPct}%` }}
              />
            </div>
          </div>

          <input
            type="range"
            min={MIN_YEAR}
            max={MAX_YEAR}
            value={year}
            onChange={(e) => { stopPlayback(); setYear(Number(e.target.value)); }}
            className="relative w-full cursor-pointer"
            style={{
              WebkitAppearance: "none",
              appearance: "none",
              height: "6px",
              borderRadius: "4px",
              background: "transparent",
              outline: "none",
            }}
          />
        </div>

        {/* Tick labels */}
        <div className="relative mb-3 h-5">
          {TICK_YEARS.map(y => {
            const pct = ((y - MIN_YEAR) / totalSpan) * 100;
            const isHistYear = y <= HIST_END;
            return (
              <button
                key={y}
                onClick={() => { stopPlayback(); setYear(y); }}
                className="absolute -translate-x-1/2 text-[9px] transition hover:text-foreground"
                style={{
                  left: `${pct}%`,
                  color: year === y ? "white" : isHistYear ? "oklch(0.7 0.15 250)" : "oklch(0.65 0.15 45)",
                  fontWeight: year === y ? 700 : 400,
                }}
              >
                {y}
                {y === HIST_END && (
                  <span className="block text-center text-[8px] leading-none opacity-60">CSV→ML</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={reset}
              title="Reset to 1991"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={isPlaying ? stopPlayback : startPlayback}
              className={`flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg transition-all ${
                isPlaying
                  ? "bg-orange-500 hover:bg-orange-500/80"
                  : "bg-primary hover:bg-primary/80"
              }`}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
            </button>
            <div className="ml-2 text-xs text-muted-foreground">
              {isPlaying ? (
                <span className="flex items-center gap-1">
                  <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${isHistorical ? "bg-primary" : "bg-orange-400"}`} />
                  {isHistorical ? "Playing historical data…" : "Playing AI forecast…"}
                </span>
              ) : (
                <span>Drag or click year ticks · Press ▶ to animate</span>
              )}
            </div>
          </div>

          {/* Divider between zones */}
          <div className="hidden items-center gap-2 text-[10px] sm:flex">
            <span className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary">
              <Database className="h-2.5 w-2.5" /> 1991–2020 CSV
            </span>
            <span className="text-muted-foreground">→</span>
            <span className="flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-orange-400">
              <Brain className="h-2.5 w-2.5" /> 2021–2075 ML
            </span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-5 text-[11px]">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Droplet className="h-3.5 w-3.5 text-primary" />
              <span>Mode: <strong className={isHistorical ? "text-primary" : "text-orange-400"}>
                {isHistorical ? "Historical" : "AI Forecast"}
              </strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              <span className="text-[10px]">Hover circles for details</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          border: 3px solid ${isHistorical ? "oklch(0.65 0.2 250)" : "oklch(0.65 0.18 45)"};
          cursor: pointer;
          box-shadow: 0 0 8px rgba(0,0,0,0.4);
          transition: border-color 0.3s;
        }
        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          border: 3px solid ${isHistorical ? "oklch(0.65 0.2 250)" : "oklch(0.65 0.18 45)"};
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
