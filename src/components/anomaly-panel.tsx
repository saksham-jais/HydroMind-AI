import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAnomalies } from "@/lib/api/hooks";
import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const typeLabels: Record<string, string> = {
  sudden_drop: "Sudden Drop",
  abnormal_extraction: "Abnormal Extraction",
  sensor_spike: "Sensor Spike",
};

export function AnomalyPanel() {
  const { data: anomalies } = useAnomalies();
  const flagged = anomalies.filter((a) => a.flagged);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-critical/10 p-1.5 text-critical">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Anomaly Detection</h3>
            <p className="text-xs text-muted-foreground">Isolation Forest · real-time sensor analysis</p>
          </div>
        </div>
        <Badge variant="outline" className="border-critical/30 bg-critical/10 text-critical">
          {flagged.length} active
        </Badge>
      </div>
      <ul className="mt-4 space-y-2">
        {anomalies.map((a) => (
          <li
            key={a.id}
            className={cn(
              "rounded-md border p-3 text-sm",
              a.flagged ? "border-critical/30 bg-critical/5" : "border-border bg-muted/20",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{a.village}</p>
                <p className="text-[10px] text-muted-foreground">{a.district} · {typeLabels[a.type]}</p>
              </div>
              <span className="shrink-0 font-mono text-xs tabular-nums text-critical">
                {(a.score * 100).toFixed(0)}%
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{a.description}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
