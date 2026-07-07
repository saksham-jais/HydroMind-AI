import { Card } from "@/components/ui/card";
import { useRisk } from "@/lib/api/hooks";
import { riskCategory } from "@/lib/mock-data";

const categoryLabels = {
  safe: "Safe",
  "semi-critical": "Semi-Critical",
  critical: "Critical",
  "over-exploited": "Over-Exploited",
} as const;

export function RiskMeter({ 
  district = "Mehsana", 
  score = 92, 
  category = "Over-Exploited" 
}: { 
  district?: string; 
  score?: number; 
  category?: string; 
}) {
  const tone = category.toLowerCase() === "over-exploited" || category.toLowerCase() === "critical" ? "critical" : category.toLowerCase() === "semi-critical" ? "warning" : "safe";
  const toneClass = tone === "critical" ? "bg-critical" : tone === "warning" ? "bg-warning" : "bg-safe";
  const displayCat = categoryLabels[category.toLowerCase() as keyof typeof categoryLabels] || category;
  
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Composite Risk — {district}</h3>
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">CGWB Data</span>
      </div>
      <div className="mt-4 flex items-baseline gap-3">
        <span className="text-5xl font-semibold tabular-nums">{score}<span className="text-2xl text-muted-foreground">%</span></span>
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${tone === "critical" ? "bg-critical/15 text-critical" : tone === "warning" ? "bg-warning/20 text-warning" : "bg-safe/15 text-safe"}`}>
          {displayCat}
        </span>
      </div>
      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${toneClass} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        <span>0</span><span>50</span><span>100</span>
      </div>
    </Card>
  );
}
