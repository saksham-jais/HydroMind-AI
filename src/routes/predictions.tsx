import { createFileRoute } from "@tanstack/react-router";
import { ForecastPanel } from "@/components/forecast-panel";
import { CrisisCountdown } from "@/components/crisis-countdown";
import { RiskMeter } from "@/components/risk-meter";
import { TrendChart } from "@/components/trend-chart";
import { AIInsights } from "@/components/ai-insights";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/predictions")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Predictions · HydroMind AI" },
      { name: "description", content: "AI forecasts and crisis countdowns for Gujarat groundwater." },
    ],
  }),
  component: Predictions,
});

function Predictions() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Predictions</h1>
        <p className="text-sm text-muted-foreground">LightGBM forecasts · CatBoost ensemble risk scoring.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ForecastPanel />
        <CrisisCountdown />
        <RiskMeter />
        <Card className="p-5">
          <h3 className="text-sm font-semibold">12-Month Depletion Curve</h3>
          <p className="text-xs text-muted-foreground">State-aggregated water table depth</p>
          <div className="mt-3"><TrendChart /></div>
        </Card>
      </div>
      <AIInsights />
    </div>
  );
}
