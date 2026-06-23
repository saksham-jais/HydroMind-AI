import { Card } from "@/components/ui/card";
import { useCrisis } from "@/lib/api/hooks";
import { AlertTriangle } from "lucide-react";

export function CrisisCountdown({ villageId = "v1" }: { villageId?: string }) {
  const { data: crisis } = useCrisis(villageId);
  if (!crisis) return <Card className="h-[142px] animate-pulse border-critical/30 bg-muted/50 p-5" />;
  const target = new Date(crisis.predictedDate);
  const days = crisis.remainingDays;
  return (
    <Card className="overflow-hidden border-critical/30 bg-gradient-to-br from-critical/5 to-transparent p-5">
      <div className="flex items-center gap-2 text-critical">
        <AlertTriangle className="h-4 w-4" />
        <h3 className="text-sm font-semibold uppercase tracking-wider">Crisis Countdown — {crisis.village}</h3>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Critical level</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{crisis.criticalLevel}<span className="text-sm font-normal text-muted-foreground"> ft</span></p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Predicted date</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {new Date(crisis.predictedDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Remaining</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-critical">{days}<span className="text-sm font-normal text-muted-foreground"> days</span></p>
        </div>
      </div>
    </Card>
  );
}
