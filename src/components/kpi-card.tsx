import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: string;
  deltaTone?: "up" | "down" | "neutral";
  icon: LucideIcon;
  accent?: "primary" | "warning" | "critical" | "safe";
}

export function KpiCard({ label, value, unit, delta, deltaTone = "neutral", icon: Icon, accent = "primary" }: KpiCardProps) {
  const accentMap = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/15 text-warning",
    critical: "bg-critical/15 text-critical",
    safe: "bg-safe/15 text-safe",
  };
  const toneMap = {
    up: "text-critical",
    down: "text-safe",
    neutral: "text-muted-foreground",
  };
  return (
    <Card className="p-5 border-l-4 border-l-primary/40 hover:border-l-accent transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">
            {value}
            {unit && <span className="ml-1 text-base font-normal text-muted-foreground">{unit}</span>}
          </p>
          {delta && <p className={cn("mt-1 text-xs font-medium", toneMap[deltaTone])}>{delta}</p>}
        </div>
        <div className={cn("rounded-md p-2", accentMap[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
