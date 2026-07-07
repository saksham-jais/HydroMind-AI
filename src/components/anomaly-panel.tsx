import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, TrendingDown, Zap, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

// Classify the *type* of anomaly based on district characteristics
function classifyAnomaly(d: any): {
  type: string;
  typeLabel: string;
  description: string;
  score: number;
  flagged: boolean;
} {
  const depth = d.predictedDepth_m ?? 0;
  const rate = d.annualDeclineRate_m ?? 0;
  const risk = d.riskScore ?? 0;

  // Score: combine depth severity + decline rate severity
  const depthScore = Math.min(1, depth / 50);
  const rateScore = rate > 0 ? Math.min(1, rate / 2.0) : 0;
  const score = Math.round((depthScore * 0.5 + rateScore * 0.5) * 100) / 100;

  const flagged = risk >= 75 || d.category === "Over-Exploited" || d.category === "Critical";

  // Classify by decline rate pattern
  if (rate > 0.5) {
    return {
      type: "rapid_decline",
      typeLabel: "Rapid Decline",
      description: `Declining at +${(rate * 3.28084).toFixed(2)} ft/yr — ${
        depth > 30 ? "industrial over-extraction likely" :
        depth > 15 ? "intensive irrigation draw detected" :
        "accelerated seasonal depletion"
      }`,
      score,
      flagged,
    };
  }
  if (rate > 0.1) {
    return {
      type: "gradual_depletion",
      typeLabel: "Gradual Depletion",
      description: `Slow depletion at +${(rate * 3.28084).toFixed(2)} ft/yr — consistent agricultural or household draw`,
      score,
      flagged,
    };
  }
  if (d.category === "Over-Exploited") {
    return {
      type: "over_exploited",
      typeLabel: "Over-Exploited Zone",
      description: `CGWB classified Over-Exploited · extraction exceeds annual recharge capacity`,
      score: Math.max(score, 0.7),
      flagged: true,
    };
  }
  return {
    type: "at_risk",
    typeLabel: "At Risk",
    description: `Risk score ${risk.toFixed(0)}% — monitor for further depletion signals`,
    score,
    flagged,
  };
}

const TYPE_ICON: Record<string, typeof TrendingDown> = {
  rapid_decline:    TrendingDown,
  gradual_depletion: Activity,
  over_exploited:   Zap,
  at_risk:          ShieldAlert,
};

interface AnomalyPanelProps {
  /** Pass the ML district array from the parent (avoids re-fetching) */
  districts?: any[];
}

export function AnomalyPanel({ districts = [] }: AnomalyPanelProps) {
  // Derive anomalies from the same ML data the rest of the page uses
  const anomalies = useMemo(() => {
    if (!districts.length) return [];

    return districts
      .filter((d: any) => d.riskScore >= 50 || d.annualDeclineRate_m > 0.05)
      .map((d: any) => ({ district: d, ...classifyAnomaly(d) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [districts]);

  const flagged = anomalies.filter((a) => a.flagged).length;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-critical/10 p-1.5 text-critical">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Anomaly Detection</h3>
            <p className="text-xs text-muted-foreground">ML pattern analysis · {districts.length} districts</p>
          </div>
        </div>
        <Badge variant="outline" className="border-critical/30 bg-critical/10 text-critical">
          {flagged} active
        </Badge>
      </div>

      {!districts.length ? (
        <div className="mt-4 space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {anomalies.map((a, i) => {
            const Icon = TYPE_ICON[a.type] ?? ShieldAlert;
            return (
              <li
                key={`${a.district.name}-${i}`}
                className={cn(
                  "rounded-md border p-3 text-sm",
                  a.flagged
                    ? "border-critical/30 bg-critical/5"
                    : "border-border bg-muted/20"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", a.flagged ? "text-critical" : "text-muted-foreground")} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{a.district.name}</p>
                      <p className="text-[10px] text-muted-foreground">{a.district.category} · {a.typeLabel}</p>
                    </div>
                  </div>
                  <span className={cn("shrink-0 font-mono text-xs tabular-nums", a.flagged ? "text-critical" : "text-muted-foreground")}>
                    {Math.round(a.score * 100)}%
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{a.description}</p>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
