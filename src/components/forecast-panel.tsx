import { Card } from "@/components/ui/card";
import { useForecast } from "@/lib/api/hooks";
import { Sparkles } from "lucide-react";

export function ForecastPanel({ villageId = "v1" }: { villageId?: string }) {
  const { data: forecast } = useForecast(villageId);
  const items = [
    { label: "Current", value: forecast.current, sub: "Today" },
    { label: "30 Day", value: forecast.d30, sub: "Forecast" },
    { label: "90 Day", value: forecast.d90, sub: "Forecast" },
    { label: "180 Day", value: forecast.d180, sub: "Forecast" },
    { label: "365 Day", value: forecast.d365, sub: "Forecast" },
  ];
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">AI Forecast — Mehsana</h3>
          <p className="text-xs text-muted-foreground">Water depth below ground level (ft)</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-md bg-accent/10 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-accent">
          <Sparkles className="h-3 w-3" /> LightGBM
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((it, idx) => (
          <div
            key={it.label}
            className="rounded-md border border-border bg-muted/30 p-3"
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{it.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
              {it.value}
              <span className="ml-1 text-xs font-normal text-muted-foreground">ft</span>
            </p>
            <p className="text-[10px] text-muted-foreground">{it.sub}</p>
            {idx > 0 && (
              <p className="mt-1 text-[10px] font-medium text-critical">
                +{it.value - forecast.current} ft deeper
              </p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
