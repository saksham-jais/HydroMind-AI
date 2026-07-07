import { Card } from "@/components/ui/card";
import { AlertTriangle, TrendingDown, TrendingUp, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export function CrisisCountdown({ 
  district = "Mehsana",
  category = "Over-Exploited"
}: { 
  district?: string;
  category?: string;
}) {
  const { data: forecast, isLoading } = useQuery({
    queryKey: ["districtForecast", district, category],  // include category so it refetches on change
    queryFn: async () => {
      const url = `http://127.0.0.1:8000/api/analysis/district-forecast/${encodeURIComponent(district)}?cgwb_category=${encodeURIComponent(category)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Forecast fetch failed");
      return res.json();
    },
    enabled: !!district,
  });

  // Trust backend's isInCrisis flag — it accounts for both CGWB classification AND ML slope
  const isSafe = !forecast?.isInCrisis;
  const hasError = forecast?.error;

  return (
    <Card className={`overflow-hidden p-5 ${isSafe ? 'border-safe/30 bg-gradient-to-br from-safe/5 to-transparent' : 'border-critical/30 bg-gradient-to-br from-critical/5 to-transparent'}`}>
      <div className={`flex items-center gap-2 ${isSafe ? 'text-safe' : 'text-critical'}`}>
        {isSafe ? <TrendingUp className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        <h3 className="text-sm font-semibold uppercase tracking-wider">
          {isSafe ? 'Stability Status' : 'Crisis Countdown'} — {district}
        </h3>
      </div>

      {isLoading ? (
        <div className="mt-4 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-xs">Loading ML forecast...</span>
        </div>
      ) : hasError ? (
        <p className="mt-3 text-xs text-muted-foreground">No model data for this district yet.</p>
      ) : forecast ? (
        <>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Predicted Depth</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {Math.abs(forecast.currentDepth_m).toFixed(1)}
                <span className="text-sm font-normal text-muted-foreground"> m</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Crisis Date</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{forecast.crisisDate}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Remaining</p>
              <p className={`mt-1 text-2xl font-semibold tabular-nums ${isSafe ? 'text-safe' : 'text-critical'}`}>
                {forecast.daysToCrisis > 10000 ? ">3650" : forecast.daysToCrisis}
                <span className="text-sm font-normal text-muted-foreground"> days</span>
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              {forecast.annualDeclineRate_m > 0 
                ? <TrendingDown className="h-3 w-3 text-critical" /> 
                : <TrendingUp className="h-3 w-3 text-safe" />}
              <span>
                {forecast.annualDeclineRate_m > 0 ? "Declining" : "Recovering"} at{" "}
                <strong>{Math.abs(forecast.annualDeclineRate_m).toFixed(3)} m/yr</strong> (LR Model)
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">R²</span>
              <span className={`text-[10px] font-semibold ${
                forecast.r2_accuracy >= 0.5 ? "text-safe" :
                forecast.r2_accuracy >= 0 ? "text-warning" : "text-muted-foreground"
              }`}>
                {forecast.r2_accuracy.toFixed(2)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                ({forecast.r2_accuracy >= 0.5 ? "Good" : forecast.r2_accuracy >= 0 ? "Fair" : "Low fit"})
              </span>
            </div>
          </div>
        </>
      ) : null}
    </Card>
  );
}
