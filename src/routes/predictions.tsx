import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from "recharts";
import {
  TrendingDown, TrendingUp, AlertTriangle, CheckCircle2, Clock,
  Beaker, BarChart3, Activity, Info
} from "lucide-react";

export const Route = createFileRoute("/predictions")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Predictions · HydroMind AI" },
      { name: "description", content: "ML-powered groundwater depletion forecasts for all Gujarat districts." },
    ],
  }),
  component: Predictions,
});

const ALL_DISTRICTS = [
  "Ahmedabad","Amreli","Anand","Aravalli","Banaskantha","Bharuch","Bhavnagar",
  "Botad","Chhota Udaipur","Dang","Devbhumi Dwarka","Dohad","Gandhinagar",
  "Jamnagar","Junagadh","Kachchh","Kheda","Mahesana","Mahisagar","Morbi",
  "Narmada","Navsari","Panchmahals","Patan","Porbandar","Sabarkantha",
  "Surat","Surendranagar","Tapi","Vadodara","Valsad"
];

function useForecast(district: string, category = "") {
  return useQuery({
    queryKey: ["districtForecast", district, category],
    queryFn: async () => {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"}/api/analysis/district-forecast/${encodeURIComponent(district)}?cgwb_category=${encodeURIComponent(category)}`
      );
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!district,
  });
}

function useAllDistrictForecasts() {
  return useQuery({
    queryKey: ["allDistrictForecasts"],
    queryFn: async () => {
      const results = await Promise.all(
        ALL_DISTRICTS.map(async (d) => {
          try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"}/api/analysis/district-forecast/${encodeURIComponent(d)}`);
            const data = await res.json();
            return { district: d, ...data };
          } catch {
            return { district: d, error: true };
          }
        })
      );
      return results.filter((r) => !r.error && !r.error);
    },
    staleTime: 300000,
  });
}

function RiskBadge({ category }: { category: string }) {
  const cfg: Record<string, { cls: string; label: string }> = {
    "Over-Exploited": { cls: "bg-critical/15 text-critical", label: "Over-Exploited" },
    "Critical":       { cls: "bg-orange-500/15 text-orange-400", label: "Critical" },
    "Semi-Critical":  { cls: "bg-warning/20 text-warning", label: "Semi-Critical" },
    "Safe":           { cls: "bg-safe/15 text-safe", label: "Safe" },
  };
  const c = cfg[category] ?? { cls: "bg-muted text-muted-foreground", label: category };
  return <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${c.cls}`}>{c.label}</span>;
}

function DistrictForecastChart({ district }: { district: string }) {
  const { data: forecast, isLoading } = useForecast(district);

  const chartData = useMemo(() => {
    if (!forecast?.trend) return [];
    const trend = forecast.trend as { year: number; level: number; actualLevel?: number }[];
    // Historical 1991-2020
    const hist = trend.map((t) => ({
      year: t.year,
      historical: Math.abs(t.level) * 3.28084,
      actual: t.actualLevel !== undefined && t.actualLevel !== null ? Math.abs(t.actualLevel) * 3.28084 : undefined,
      predicted: undefined as number | undefined,
    }));
    // Future 2021-2075 using slope
    const slope = forecast.annualDeclineRate_m ?? 0;
    const lastHist = trend[trend.length - 1];
    const baseDepth = Math.abs(lastHist?.level ?? 10);
    const future = [];
    for (let y = 2021; y <= 2075; y += 1) {
      future.push({
        year: y,
        historical: undefined as number | undefined,
        actual: undefined as number | undefined,
        predicted: Math.max(0, Math.round((baseDepth + slope * (y - 2020)) * 10) / 10) * 3.28084,
      });
    }
    return [...hist, ...future];
  }, [forecast]);

  if (isLoading) return <div className="h-64 animate-pulse rounded bg-muted" />;
  if (!forecast || forecast.error) return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No model data for this district.</div>;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4">
        <div className="text-center">
          <div className="text-3xl font-bold tabular-nums">{(forecast.currentDepth_m * 3.28084).toFixed(1)}<span className="text-base font-normal text-muted-foreground"> ft</span></div>
          <div className="text-[10px] text-muted-foreground">Predicted 2026 depth</div>
        </div>
        <div className="text-center">
          <div className={`text-3xl font-bold tabular-nums ${forecast.isInCrisis ? "text-critical" : "text-safe"}`}>
            {forecast.daysToCrisis > 10000 ? "Stable" : `${forecast.daysToCrisis.toLocaleString()} days`}
          </div>
          <div className="text-[10px] text-muted-foreground">Time to crisis (~197ft threshold)</div>
        </div>
        <div className="text-center">
          <div className={`text-3xl font-bold tabular-nums ${forecast.annualDeclineRate_m > 0 ? "text-critical" : "text-safe"}`}>
            {forecast.annualDeclineRate_m > 0 ? "+" : ""}{(forecast.annualDeclineRate_m * 3.28084).toFixed(2)}
            <span className="text-base font-normal text-muted-foreground"> ft/yr</span>
          </div>
          <div className="text-[10px] text-muted-foreground">Annual rate ({forecast.modelType || "LR Model"})</div>
        </div>
        <div className="text-center">
          <div className={`text-3xl font-bold tabular-nums ${forecast.r2_accuracy >= 0 ? "text-warning" : "text-muted-foreground"}`}>
            {forecast.r2_accuracy.toFixed(2)}
          </div>
          <div className="text-[10px] text-muted-foreground">R² accuracy ({forecast.r2_accuracy >= 0.5 ? "Good" : forecast.r2_accuracy >= 0 ? "Fair" : "Low fit"})</div>
        </div>
        <div className="ml-auto">
          <RiskBadge category={forecast.isInCrisis ? (forecast.daysToCrisis < 3650 ? "Critical" : "Over-Exploited") : "Safe"} />
          {forecast.crisisDate !== "Stable" && (
            <div className="mt-1 text-center text-[10px] text-muted-foreground">Crisis: {forecast.crisisDate}</div>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="oklch(0.6 0.15 220)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="oklch(0.6 0.15 220)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="oklch(0.58 0.22 27)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="oklch(0.58 0.22 27)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
          <XAxis dataKey="year" tick={{ fontSize: 10 }} tickLine={false}
            ticks={[1991, 2000, 2010, 2020, 2030, 2040, 2050, 2060, 2075]} />
          <YAxis reversed tick={{ fontSize: 10 }} tickLine={false}
            tickFormatter={(v) => `${Math.round(v)}ft`} domain={['auto', 'auto']} />
          <RechartTooltip
            formatter={(val: any, name: string) => [`${Number(val).toFixed(1)} ft bgl`, name]}
            labelFormatter={(l) => `Year: ${l}`}
            contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: 11 }}
          />
          <ReferenceLine y={196.85} stroke="oklch(0.58 0.22 27)" strokeDasharray="4 2"
            label={{ value: "Crisis 197ft", position: "insideTopRight", fontSize: 9, fill: "oklch(0.58 0.22 27)" }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          
          <Area type="monotone" dataKey="actual" name="Actual Data" stroke="oklch(0.6 0.15 220)"
            fill="url(#histGrad)" strokeWidth={2.5} dot={{ r: 2, fill: "oklch(0.6 0.15 220)", strokeWidth: 0 }} connectNulls />
            
          <Area type="monotone" dataKey="historical" name="ML Trend (Past)" stroke="oklch(0.6 0.15 220)"
            fill="none" strokeWidth={1} dot={false} strokeDasharray="3 3" connectNulls />
            
          <Area type="monotone" dataKey="predicted" name="ML Forecast" stroke="oklch(0.58 0.22 27)"
            fill="url(#predGrad)" strokeWidth={2} dot={false} strokeDasharray="5 3" connectNulls />
        </AreaChart>
      </ResponsiveContainer>
      <p className="mt-1 text-[10px] text-muted-foreground">
        ↑ Y-axis inverted — higher on chart = deeper water table (worse).
        Red dashed line = crisis threshold (~197ft). ML uses 2005–2020 training data.
      </p>
    </div>
  );
}

function AllDistrictsRankingTable() {
  const { data: all = [], isLoading } = useAllDistrictForecasts();

  const sorted = useMemo(() =>
    [...all].sort((a, b) => (a.daysToCrisis ?? 99999) - (b.daysToCrisis ?? 99999)),
    [all]
  );

  if (isLoading) return <div className="h-64 animate-pulse rounded bg-muted" />;

  return (
    <div className="max-h-96 overflow-y-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-card">
          <tr className="border-b border-border text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <th className="py-2 pr-3 text-left">#</th>
            <th className="py-2 pr-3 text-left">District</th>
            <th className="py-2 pr-3 text-right">Depth 2026 (ft)</th>
            <th className="py-2 pr-3 text-right">Rate ft/yr</th>
            <th className="py-2 pr-3 text-right">Days to Crisis</th>
            <th className="py-2 text-center">R²</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((d, i) => {
            const isCrisis = d.isInCrisis;
            const daysVal = d.daysToCrisis > 10000 ? null : d.daysToCrisis;
            return (
              <tr key={d.district} className="border-b border-border/50 transition hover:bg-muted/40">
                <td className="py-1.5 pr-3 tabular-nums text-muted-foreground">{i + 1}</td>
                <td className="py-1.5 pr-3 font-medium">{d.district}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">
                  {(d.currentDepth_m * 3.28084).toFixed(1)} ft
                </td>
                <td className={`py-1.5 pr-3 text-right tabular-nums font-medium ${d.annualDeclineRate_m > 0 ? "text-critical" : "text-safe"}`}>
                  {d.annualDeclineRate_m > 0 ? "+" : ""}{(d.annualDeclineRate_m * 3.28084).toFixed(2)}
                </td>
                <td className="py-1.5 pr-3 text-right">
                  {daysVal ? (
                    <span className={`font-semibold tabular-nums ${daysVal < 3650 ? "text-critical" : daysVal < 7300 ? "text-warning" : "text-foreground"}`}>
                      {daysVal.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-safe">Stable</span>
                  )}
                </td>
                <td className="py-1.5 text-center">
                  <span className={`text-[10px] ${d.r2_accuracy >= 0 ? "text-warning" : "text-muted-foreground"}`}>
                    {d.r2_accuracy?.toFixed(2)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SummaryKPIs({ all }: { all: any[] }) {
  const declining = all.filter((d) => d.annualDeclineRate_m > 0).length;
  const crisis10yr = all.filter((d) => d.daysToCrisis < 3650).length;
  const crisis30yr = all.filter((d) => d.daysToCrisis < 10950).length;
  const stable = all.filter((d) => d.daysToCrisis > 10000).length;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        { label: "Declining Districts", value: declining, icon: TrendingDown, color: "text-critical", bg: "bg-critical/10" },
        { label: "Crisis < 10 Years", value: crisis10yr, icon: AlertTriangle, color: "text-critical", bg: "bg-critical/10" },
        { label: "Crisis < 30 Years", value: crisis30yr, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
        { label: "Stable / Recovering", value: stable, icon: CheckCircle2, color: "text-safe", bg: "bg-safe/10" },
      ].map((k) => (
        <Card key={k.label} className={`flex items-center gap-3 p-4 ${k.bg}`}>
          <k.icon className={`h-5 w-5 ${k.color}`} />
          <div>
            <div className={`text-2xl font-bold tabular-nums ${k.color}`}>{k.value}</div>
            <div className="text-[10px] text-muted-foreground">{k.label}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Predictions() {
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const { data: allForecasts = [], isLoading: allLoading } = useAllDistrictForecasts();

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">ML Predictions</h1>
        <p className="text-sm text-muted-foreground">
          Linear Trend Extrapolation models trained on 2005–2020 CGWB data · 31 district models · 80/20 backtested
        </p>
      </div>

      {/* Summary KPIs */}
      {!allLoading && <SummaryKPIs all={allForecasts} />}

      {/* District Deep-Dive Forecast */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">District Deep-Dive Forecast</h2>
          </div>
          <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Select a district..." />
            </SelectTrigger>
            <SelectContent>
              {ALL_DISTRICTS.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedDistrict ? (
          <DistrictForecastChart district={selectedDistrict} />
        ) : (
          <div className="flex h-64 flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-md mt-4">
            <Activity className="h-8 w-8 mb-3 opacity-20" />
            <p className="text-sm">No district selected</p>
            <p className="text-xs opacity-70 mt-1">Please select a district from the dropdown above to view its ML prediction chart.</p>
          </div>
        )}
      </Card>

      {/* All Districts Ranking */}
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">All Districts — Crisis Timeline Ranking</h2>
          <span className="ml-auto text-[10px] text-muted-foreground">Sorted by days to 60m crisis threshold</span>
        </div>
        <AllDistrictsRankingTable />
      </Card>

      {/* Model Info */}
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <Beaker className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <h3 className="text-sm font-semibold">About the Forecasting Model</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              HydroMind AI uses <strong>Linear Trend Extrapolation</strong> to project future groundwater levels. While advanced gradient boosters 
              (like XGBoost or LightGBM) are great for identifying complex seasonal patterns within known date ranges, they are inherently incapable 
              of extrapolating continuous trends into the deep future (they produce flat lines past the year 2020). By using linear extrapolation 
              on the most recent historical data segment (2005–2020), we capture the true annual rate of decline (m/yr) and project it accurately to 2075.
              The <strong>60m crisis threshold</strong> represents the depth at which most shallow bore wells in Gujarat run dry.
            </p>
            <div className="mt-2 flex gap-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><Info className="h-3 w-3" /> Training data: CGWB 2005–2020</span>
              <span className="flex items-center gap-1"><Info className="h-3 w-3" /> Algorithms: Linear Regression (scikit-learn)</span>
              <span className="flex items-center gap-1"><Info className="h-3 w-3" /> Districts: 31 unique models</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
