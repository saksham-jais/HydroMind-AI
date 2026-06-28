import { createFileRoute } from "@tanstack/react-router";
import { Building2, Droplet, AlertTriangle, BellRing } from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { VillageTable } from "@/components/village-table";
import { TrendChart } from "@/components/trend-chart";
import { ForecastPanel } from "@/components/forecast-panel";
import { CrisisCountdown } from "@/components/crisis-countdown";
import { RiskMeter } from "@/components/risk-meter";
import { AIInsights } from "@/components/ai-insights";
import { AnomalyPanel } from "@/components/anomaly-panel";
import { Card } from "@/components/ui/card";
import { useTotals } from "@/lib/api/hooks";
import { lazy, Suspense } from "react";

const GujaratMap = lazy(() => import("@/components/gujarat-map").then((m) => ({ default: m.GujaratMap })));

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Overview · Jalrakshak AI" },
      { name: "description", content: "Real-time groundwater risk overview across Gujarat villages." },
    ],
  }),
  component: Overview,
});

function Overview() {
  const { data: totals } = useTotals();
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">State-wide groundwater intelligence at a glance.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Villages" value={totals.villages} icon={Building2} accent="primary" delta="Monitored daily" />
        <KpiCard label="Avg Water Level" value={totals.avgWaterLevel} unit="ft" icon={Droplet} accent="primary" delta="+3 ft vs last month" deltaTone="up" />
        <KpiCard label="High-Risk Villages" value={totals.highRisk} icon={AlertTriangle} accent="critical" delta="+2 this week" deltaTone="up" />
        <KpiCard label="Active Alerts" value={totals.activeAlerts} icon={BellRing} accent="warning" delta="4 acknowledged" deltaTone="neutral" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Gujarat Risk Heat Map</h3>
              <p className="text-xs text-muted-foreground">Color-coded by composite risk score</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-safe" /> Safe</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning" /> Warning</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-critical" /> Critical</span>
            </div>
          </div>
          <Suspense fallback={<div className="h-[420px] animate-pulse rounded-md bg-muted" />}>
            <GujaratMap height={420} />
          </Suspense>
        </Card>
        <div className="space-y-4">
          <RiskMeter />
          <CrisisCountdown />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-5">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Water Level Trend — State Average</h3>
              <p className="text-xs text-muted-foreground">Depth below ground (ft), past 12 months</p>
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Recharts</span>
          </div>
          <TrendChart />
        </Card>
        <ForecastPanel />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Top Villages by Risk</h3>
            <span className="text-[10px] text-muted-foreground">Ranked by composite risk score</span>
          </div>
          <VillageTable limit={8} />
        </Card>
        <AIInsights />
      </div>

      <AnomalyPanel />
    </div>
  );
}
