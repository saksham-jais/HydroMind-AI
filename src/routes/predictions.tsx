import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ForecastPanel } from "@/components/forecast-panel";
import { CrisisCountdown } from "@/components/crisis-countdown";
import { RiskMeter } from "@/components/risk-meter";
import { TrendChart } from "@/components/trend-chart";
import { AIInsights } from "@/components/ai-insights";
import { Card } from "@/components/ui/card";
import { useVillages } from "@/lib/api/hooks";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [selectedVillageId, setSelectedVillageId] = useState("v1");
  const { data: villages = [] } = useVillages();
  const selectedVillage = villages.find(v => v.id === selectedVillageId) || villages[0];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Predictions</h1>
          <p className="text-sm text-muted-foreground">LightGBM forecasts · CatBoost ensemble risk scoring.</p>
        </div>
        <div className="w-full sm:w-[240px]">
          <Select value={selectedVillageId} onValueChange={setSelectedVillageId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a village..." />
            </SelectTrigger>
            <SelectContent>
              {villages.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name} ({v.district})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ForecastPanel villageId={selectedVillageId} villageName={selectedVillage?.name} />
        <CrisisCountdown villageId={selectedVillageId} />
        <RiskMeter villageId={selectedVillageId} label={`Composite Risk — ${selectedVillage?.name}`} />
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
