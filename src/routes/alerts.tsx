import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { officers } from "@/lib/mock-data";
import { useAlerts } from "@/lib/api/hooks";
import { Mail, CheckCircle2, Clock, Send } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/alerts")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Alerts · HydroMind AI" },
      { name: "description", content: "Active alerts and officer dispatch (n8n)." },
    ],
  }),
  component: Alerts,
});

const statusMap = {
  sent: { label: "Email Sent", icon: Send, cls: "bg-safe/15 text-safe" },
  pending: { label: "Pending", icon: Clock, cls: "bg-warning/20 text-warning" },
  ack: { label: "Acknowledged", icon: CheckCircle2, cls: "bg-primary/15 text-primary" },
};

function Alerts() {
  const { data: alerts } = useAlerts();
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Alert Center</h1>
        <p className="text-sm text-muted-foreground">Auto-triggered when risk score ≥ 75%. Dispatched via n8n.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {alerts.map((a) => {
          const st = statusMap[a.status as keyof typeof statusMap] ?? statusMap.pending;
          return (
            <Card key={a.id} className="p-5 border-l-4 border-l-critical">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{a.id}</p>
                  <h3 className="mt-1 text-lg font-semibold">{a.village}</h3>
                  <p className="text-xs text-muted-foreground">{a.district} District</p>
                </div>
                <Badge className={cn("border-transparent", st.cls)} variant="outline">
                  <st.icon className="mr-1 h-3 w-3" /> {st.label}
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Risk</p>
                  <p className="text-xl font-semibold text-critical tabular-nums">{a.risk}%</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Date</p>
                  <p className="font-mono">{a.date}</p>
                </div>
              </div>
              <div className="mt-4 rounded-md bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
                <span className="font-mono">n8n</span> → email dispatched to district officer
              </div>
            </Card>
          );
        })}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Officer Directory</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {officers.map((o) => (
            <Card key={o.email} className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {o.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{o.name}</p>
                  <p className="text-xs text-muted-foreground">{o.district}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                <span className="truncate">{o.email}</span>
              </div>
              <div className="mt-1 text-xs font-mono text-muted-foreground">{o.phone}</div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
