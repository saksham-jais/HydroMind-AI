import { Card } from "@/components/ui/card";
import { useInsights } from "@/lib/api/hooks";
import { Lightbulb } from "lucide-react";

export function AIInsights() {
  const { data: insights } = useInsights();
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <div className="rounded-md bg-accent/10 p-1.5 text-accent">
          <Lightbulb className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">AI Insights</h3>
          <p className="text-xs text-muted-foreground">Generated from latest data run</p>
        </div>
      </div>
      <ul className="mt-4 space-y-3">
        {insights.map((t, i) => (
          <li key={i} className="flex gap-3 rounded-md border border-border bg-muted/20 p-3 text-sm text-foreground/90">
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {i + 1}
            </span>
            <p className="leading-relaxed">{t}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
