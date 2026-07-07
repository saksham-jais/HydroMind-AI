import { createFileRoute } from "@tanstack/react-router";
import { Building2, Droplet, AlertTriangle, BellRing } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useState } from "react";
import { KpiCard } from "@/components/kpi-card";
import { TrendChart } from "@/components/trend-chart";
import { CrisisCountdown } from "@/components/crisis-countdown";
import { RiskMeter } from "@/components/risk-meter";
import { AIInsights } from "@/components/ai-insights";
import { AnomalyPanel } from "@/components/anomaly-panel";
import { Card } from "@/components/ui/card";

const GujaratMap = lazy(() =>
  import("@/components/gujarat-map").then((m) => ({ default: m.GujaratMap }))
);

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Overview · HydroMind AI" },
      { name: "description", content: "State-wide groundwater intelligence for Gujarat districts." },
    ],
  }),
  component: Overview,
});

const CATEGORY_BADGE: Record<string, string> = {
  "Over-Exploited": "bg-destructive/15 text-destructive",
  "Critical":       "bg-orange-500/15 text-orange-500",
  "Semi-Critical":  "bg-warning/15 text-warning",
  "Safe":           "bg-safe/15 text-safe",
};

function Overview() {
  const [selectedDistrict, setSelectedDistrict] = useState<any>(null);

  // Single source of truth: all 31 ML district forecasts for 2026
  const { data: districts = [], isLoading } = useQuery({
    queryKey: ["allDistrictsForecast2026"],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"}/api/analysis/districts/forecast-year?year=2026`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  // Derive KPIs directly from ML data
  const kpis = {
    totalDistricts: districts.length,
    avgDepth: districts.length
      ? (districts.reduce((s: number, d: any) => s + (d.predictedDepth_m * 3.28084), 0) / districts.length).toFixed(1)
      : "—",
    highRisk: districts.filter((d: any) => d.riskScore >= 70).length,
    overExploited: districts.filter((d: any) => d.category === "Over-Exploited").length,
  };

  // Top 10 by riskScore — same ordering as /map circles
  const topDistricts = [...districts].sort((a, b) => b.riskScore - a.riskScore).slice(0, 10);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          State-wide groundwater intelligence · {districts.length} districts · ML Forecast 2026
        </p>
      </div>

      {/* KPI row — all from ML */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Districts"
          value={kpis.totalDistricts}
          icon={Building2}
          accent="primary"
          delta="CGWB monitored"
        />
        <KpiCard
          label="Avg Depth 2026"
          value={kpis.avgDepth}
          unit="ft bgl"
          icon={Droplet}
          accent="primary"
          delta="ML predicted"
          deltaTone="neutral"
        />
        <KpiCard
          label="High-Risk Districts"
          value={kpis.highRisk}
          icon={AlertTriangle}
          accent="critical"
          delta="Risk score ≥ 70%"
          deltaTone="up"
        />
        <KpiCard
          label="Over-Exploited"
          value={kpis.overExploited}
          icon={BellRing}
          accent="warning"
          delta="CGWB classification"
          deltaTone="neutral"
        />
      </div>

      {/* Map + district panel — same circles as /map at year=2026 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Gujarat Risk Heat Map</h3>
              <p className="text-xs text-muted-foreground">Click any district · Color = ML risk score</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[oklch(0.65_0.16_145)]" /> Safe</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[oklch(0.78_0.16_75)]" /> Semi-Critical</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[oklch(0.65_0.18_45)]" /> Critical</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[oklch(0.58_0.22_27)]" /> Over-Exploited</span>
            </div>
          </div>
          <Suspense fallback={<div className="h-[420px] animate-pulse rounded-md bg-muted" />}>
            <GujaratMap height={420} onSelect={setSelectedDistrict} />
          </Suspense>
        </Card>

        {/* Right panel — updates on map click */}
        <div className="space-y-4">
          {selectedDistrict ? (
            <>
              <RiskMeter
                district={selectedDistrict.name}
                score={Math.round(selectedDistrict.riskScore)}
                category={selectedDistrict.category}
              />
              <CrisisCountdown
                district={selectedDistrict.name}
                category={selectedDistrict.category}
              />
            </>
          ) : (
            <Card className="flex h-[420px] flex-col items-center justify-center p-6 text-center border-dashed">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-semibold">No District Selected</h3>
              <p className="mt-2 text-xs text-muted-foreground max-w-[250px]">
                Click on any district circle on the map or select a row from the top districts table below to view its detailed composite risk and crisis countdown.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Trend chart + AI insights */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-5">
          <TrendChart height={320} />
        </Card>
        <AIInsights />
      </div>

      {/* Top districts table (same ML data) + Anomaly panel */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Top Districts by Risk</h3>
            <span className="text-[10px] text-muted-foreground">
              Ranked by ML risk score · same data as /map & /predictions
            </span>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2">#</th>
                    <th className="pb-2">District</th>
                    <th className="pb-2 text-right">Depth (ft)</th>
                    <th className="pb-2 text-right">Rate ft/yr</th>
                    <th className="pb-2 text-right">Risk</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {topDistricts.map((d: any, i: number) => (
                    <tr
                      key={d.name}
                      className="cursor-pointer transition hover:bg-muted/50"
                      onClick={() => setSelectedDistrict(d)}
                    >
                      <td className="py-2 pr-2 text-xs text-muted-foreground">{i + 1}</td>
                      <td className="py-2 font-medium">{d.name}</td>
                      <td className="py-2 text-right tabular-nums">{(d.predictedDepth_m * 3.28084).toFixed(1)} ft</td>
                      <td className={`py-2 text-right tabular-nums font-medium text-xs ${d.annualDeclineRate_m > 0 ? "text-destructive" : "text-safe"}`}>
                        {d.annualDeclineRate_m > 0 ? "+" : ""}{(d.annualDeclineRate_m * 3.28084).toFixed(2)}
                      </td>
                      <td className="py-2 text-right tabular-nums font-semibold">{d.riskScore.toFixed(0)}%</td>
                      <td className="py-2 text-right">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${CATEGORY_BADGE[d.category] ?? "bg-muted text-muted-foreground"}`}>
                          {d.category}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Anomaly panel — uses same district ML data */}
        <AnomalyPanel districts={districts} />
      </div>
    </div>
  );
}
