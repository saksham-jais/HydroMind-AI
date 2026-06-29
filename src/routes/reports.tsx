import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";

const reports = [
  { title: "Monthly Report", desc: "State-wide groundwater summary for the current month.", pages: 24 },
  { title: "District Report", desc: "Per-district risk breakdown and trend analysis.", pages: 18 },
  { title: "Risk Analysis", desc: "Composite risk modeling, top critical villages, projections.", pages: 32 },
  { title: "Inspection Summary", desc: "Field officer dispatch log and acknowledged alerts.", pages: 12 },
];

export const Route = createFileRoute("/reports")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reports · HydroMind AI" },
      { name: "description", content: "Generate PDF reports for districts, risk and inspections." },
    ],
  }),
  component: Reports,
});

function Reports() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">Export PDF dossiers for review and dispatch.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {reports.map((r) => (
          <Card key={r.title} className="p-5 flex flex-col">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold">{r.title}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{r.desc}</p>
              </div>
              <span className="text-[10px] text-muted-foreground">{r.pages} pp</span>
            </div>
            <div className="mt-4 flex justify-end">
              <Button size="sm" variant="outline">
                <Download className="mr-1.5 h-3.5 w-3.5" /> Generate PDF
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
