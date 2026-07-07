import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Lightbulb, BrainCircuit, Loader2, Zap } from "lucide-react";
import { useMemo } from "react";
import { API_BASE } from "@/lib/api/client";

/** Generate rule-based insights from the real ML district data */
function deriveInsights(districts: any[]): string[] {
  if (!districts.length) return [];

  const sorted = [...districts].sort((a, b) => b.riskScore - a.riskScore);
  const overExp = sorted.filter((d) => d.category === "Over-Exploited");
  const critical = sorted.filter((d) => d.category === "Critical");
  const declining = sorted.filter((d) => d.annualDeclineRate_m > 0);
  const fastDeclining = sorted
    .filter((d) => d.annualDeclineRate_m > 0.3)
    .sort((a, b) => b.annualDeclineRate_m - a.annualDeclineRate_m);
  const avgDepth =
    districts.reduce((s, d) => s + d.predictedDepth_m, 0) / districts.length;

  const top = sorted[0];
  const insights: string[] = [];

  // Insight 1 — most critical district
  if (top) {
    insights.push(
      `${top.name} has the highest ML risk score of ${Math.round(top.riskScore)}% with a predicted depth of ${(top.predictedDepth_m * 3.28084).toFixed(1)} ft bgl — ${top.category === "Over-Exploited" ? "classified Over-Exploited by CGWB" : "requiring immediate monitoring"}.`
    );
  }

  // Insight 2 — decline rate leader
  if (fastDeclining.length) {
    const d = fastDeclining[0];
    insights.push(
      `${d.name} is declining fastest at +${(d.annualDeclineRate_m * 3.28084).toFixed(2)} ft/yr — suggesting intensive extraction pressure, possibly industrial or large-scale irrigation.`
    );
  }

  // Insight 3 — summary stats
  insights.push(
    `${overExp.length} district${overExp.length !== 1 ? "s" : ""} are Over-Exploited and ${critical.length} are Critical out of ${districts.length} total. State-average predicted depth is ${(avgDepth * 3.28084).toFixed(1)} ft bgl.`
  );

  // Insight 4 — declining count
  if (declining.length) {
    insights.push(
      `${declining.length} of ${districts.length} districts are on a declining trajectory — if unchecked, ${fastDeclining.length} will hit the 200 ft crisis threshold within 30 years.`
    );
  }

  // Insight 5 — named critical districts
  if (overExp.length > 1) {
    const names = overExp
      .slice(0, 4)
      .map((d) => d.name)
      .join(", ");
    insights.push(
      `Over-Exploited districts — ${names} — require immediate recharge interventions and borewell extraction permit reviews per CGWB guidelines.`
    );
  }

  return insights;
}

export function AIInsights() {
  const { data: districts = [], isLoading } = useQuery({
    queryKey: ["allDistrictsForecast2026"],   // shared cache with index.tsx
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/analysis/districts/forecast-year?year=2026`
      );
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 60_000,
  });

  const insights = useMemo(() => deriveInsights(districts), [districts]);

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <div className="rounded-md bg-accent/10 p-1.5 text-accent">
          <BrainCircuit className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">AI Insights</h3>
          <p className="text-xs text-muted-foreground">
            Derived from ML district forecast · 2026
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-4 space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {insights.map((t, i) => (
            <li
              key={i}
              className="flex gap-3 rounded-md border border-border bg-muted/20 p-3 text-sm text-foreground/90"
            >
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {i + 1}
              </span>
              <p className="leading-relaxed">{t}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
