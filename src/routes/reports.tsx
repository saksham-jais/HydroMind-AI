import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Download, TrendingDown, MapPin, BrainCircuit, AlertTriangle,
  Loader2, Droplets, Activity, CloudRain, Database, ShieldAlert, BarChart2
} from "lucide-react";
import { useState, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Line, ComposedChart, ReferenceLine } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { DistrictForecastChart } from "./predictions";

const districts = [
  "Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha", "Bharuch", "Bhavnagar",
  "Botad", "Chhota Udaipur", "Dahod", "Dang", "Devbhumi Dwarka", "Gandhinagar",
  "Gir Somnath", "Jamnagar", "Junagadh", "Kheda", "Kutch", "Mahisagar", "Mehsana",
  "Morbi", "Narmada", "Navsari", "Panchmahal", "Patan", "Porbandar", "Rajkot",
  "Sabarkantha", "Surat", "Surendranagar", "Tapi", "Vadodara", "Valsad"
];

const categoryColors: Record<string, string> = {
  "Over-Exploited": "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/30 dark:border-red-900",
  "Critical":       "text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950/30",
  "Semi-Critical":  "text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950/30",
  "Safe":           "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30",
};

const categoryBadge = (cat: string) =>
  `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${categoryColors[cat] ?? "text-gray-600 bg-gray-100 border-gray-200"}`;

export const Route = createFileRoute("/reports")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reports & AI Analysis · HydroMind AI" },
      { name: "description", content: "AI-powered groundwater analysis using CGWB 2024 and 70-year historical data." },
    ],
  }),
  component: Reports,
});

function Reports() {
  const [district, setDistrict] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const { data: analysisData, isLoading } = useQuery({
    queryKey: ["districtAnalysis", district],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"}/api/analysis/district/${district}`);
      if (!res.ok) throw new Error("Failed to fetch analysis");
      return res.json();
    },
    enabled: !!district,
  });

  const handleDownload = async () => {
    if (!analysisData) return;
    setIsGenerating(true);
    try {
      const doc = new jsPDF("p", "mm", "a4");
      const pw = doc.internal.pageSize.getWidth();
      const m = 15;

      // Header
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pw, 44, "F");
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 40, pw, 3, "F");
      doc.setFontSize(22); doc.setTextColor(255,255,255); doc.setFont("helvetica","bold");
      doc.text("HydroMind AI", m, 16);
      doc.setFontSize(10); doc.setFont("helvetica","normal");
      doc.text(`Official District Analysis Report: ${district}, Gujarat`, m, 25);
      doc.text(`Generated: ${new Date().toLocaleString("en-IN")}  |  CGWB 2024 + 70-Year Historical Dataset`, m, 32);

      // Category badge area
      let y = 55;
      const cat = analysisData.category ?? "Unknown";
      const stage = analysisData.stage_pct ?? 0;
      const catColorMap: Record<string, [number,number,number]> = {
        "Over-Exploited": [220,38,38],
        "Critical":       [234,88,12],
        "Semi-Critical":  [202,138,4],
        "Safe":           [22,163,74],
      };
      const [cr,cg,cb] = catColorMap[cat] ?? [100,116,139];
      doc.setFillColor(cr,cg,cb);
      doc.roundedRect(m, y-6, 60, 10, 2, 2, "F");
      doc.setFontSize(9); doc.setTextColor(255,255,255); doc.setFont("helvetica","bold");
      doc.text(`${cat}  •  Stage: ${stage.toFixed(1)}%`, m+3, y);

      // Data sources
      doc.setFontSize(8); doc.setTextColor(100,116,139); doc.setFont("helvetica","normal");
      const sources = (analysisData.data_sources as string[] ?? []).join("  ·  ");
      doc.text(`Data: ${sources}`, m + 65, y);

      // Metric cards
      y += 12;
      const cards = [
        { label: "Aquifer Deficit",      value: analysisData.deficit ?? "—",        color: [59,130,246] as [number,number,number] },
        { label: "IoT Sensors",          value: analysisData.sensors ?? "—",        color: [16,185,129] as [number,number,number] },
        { label: "30-Day Rain Forecast", value: analysisData.rain_forecast ?? "—",  color: [99,102,241] as [number,number,number] },
        { label: "GW Stage",             value: `${stage.toFixed(1)}%`,             color: [cr,cg,cb] as [number,number,number] },
      ];
      const cardW = (pw - m * 2 - 12) / 4;
      cards.forEach((card, i) => {
        const cx = m + i * (cardW + 4);
        doc.setFillColor(248,250,252); doc.roundedRect(cx, y, cardW, 22, 2, 2, "F");
        doc.setFillColor(...card.color); doc.roundedRect(cx, y, 3, 22, 1, 1, "F");
        doc.setFontSize(7); doc.setTextColor(100,116,139); doc.setFont("helvetica","normal");
        doc.text(card.label, cx+5, y+8);
        doc.setFontSize(10); doc.setTextColor(15,23,42); doc.setFont("helvetica","bold");
        doc.text(card.value, cx+5, y+18);
      });

      // Chart
      y += 30;
      doc.setFontSize(12); doc.setTextColor(15,23,42); doc.setFont("helvetica","bold");
      doc.text("Groundwater Level Seasonal Trend (Meters Below Ground Level)", m, y);
      doc.setFontSize(8); doc.setTextColor(100,116,139); doc.setFont("helvetica","normal");
      doc.text("Source: 70-Year CGWB Quarterly GWL + CGWB 2024 District Stage Analysis", m, y+5);
      y += 8;
      if (chartRef.current) {
        const canvas = await html2canvas(chartRef.current, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
        const imgData = canvas.toDataURL("image/png");
        const imgW = pw - m * 2;
        const imgH = (canvas.height / canvas.width) * imgW;
        doc.addImage(imgData, "PNG", m, y, imgW, Math.min(imgH, 70));
        y += Math.min(imgH, 70) + 8;
      }

      // AI Root Cause
      doc.setFillColor(239,246,255);
      doc.setFontSize(9); doc.setFont("helvetica","normal");
      const reasonLines = doc.splitTextToSize(analysisData.reason || "No analysis available.", pw - m*2 - 14);
      const rH = reasonLines.length * 5.5 + 18;
      doc.roundedRect(m, y, pw-m*2, rH, 3, 3, "F");
      doc.setFillColor(59,130,246); doc.roundedRect(m, y, 4, rH, 1, 1, "F");
      doc.setFontSize(11); doc.setTextColor(30,58,138); doc.setFont("helvetica","bold");
      doc.text("AI Root Cause Agent (Gemini 1.5 Flash + CGWB Data)", m+7, y+10);
      doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.setTextColor(30,58,138);
      doc.text(reasonLines, m+7, y+18);
      y += rH + 6;

      // AI Prediction
      doc.setFillColor(255,251,235);
      doc.setFontSize(9); doc.setFont("helvetica","normal");
      const predLines = doc.splitTextToSize(analysisData.prediction || "No prediction available.", pw-m*2-14);
      const pH = predLines.length * 5.5 + 18;
      doc.roundedRect(m, y, pw-m*2, pH, 3, 3, "F");
      doc.setFillColor(245,158,11); doc.roundedRect(m, y, 4, pH, 1, 1, "F");
      doc.setFontSize(11); doc.setTextColor(180,83,9); doc.setFont("helvetica","bold");
      doc.text("AI Predictive Alert — 30-Day Risk Forecast", m+7, y+10);
      doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.setTextColor(120,53,15);
      doc.text(predLines, m+7, y+18);
      y += pH + 8;

      // Monthly data table
      if (analysisData.data?.length > 0) {
        if (y > 220) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(12); doc.setTextColor(15,23,42); doc.setFont("helvetica","bold");
        doc.text("Monthly Aquifer Level Summary", m, y); y += 6;
        const colW = (pw-m*2)/3;
        const headers = ["Month", "GW Level (m below surface)", "Status"];
        doc.setFillColor(15,23,42); doc.rect(m, y, pw-m*2, 8, "F");
        doc.setFontSize(8); doc.setTextColor(255,255,255); doc.setFont("helvetica","bold");
        headers.forEach((h,i) => doc.text(h, m+4+i*colW, y+5.5));
        y += 8;
        analysisData.data.forEach((row: any, idx: number) => {
          doc.setFillColor(idx%2===0?248:241, idx%2===0?250:245, idx%2===0?252:255);
          doc.rect(m, y, pw-m*2, 7, "F");
          doc.setFontSize(8); doc.setTextColor(30,30,30); doc.setFont("helvetica","normal");
          const level = Math.abs(row.level).toFixed(1);
          const status = parseFloat(level) > 15 ? "Deep" : parseFloat(level) > 8 ? "Moderate" : "Shallow";
          doc.text(row.month, m+4, y+5);
          doc.text(`${level} m`, m+4+colW, y+5);
          doc.text(status, m+4+colW*2, y+5);
          y += 7;
        });
      }

      // Footer
      let footerY = doc.internal.pageSize.getHeight() - 12;
      doc.setFillColor(15,23,42); doc.rect(0, footerY-2, pw, 14, "F");
      doc.setFontSize(8); doc.setTextColor(148,163,184);
      doc.text("HydroMind AI  •  Powered by Gemini 1.5 Flash  •  CGWB 2024 + 70yr Historical Dataset  •  Predict. Alert. Prevent.", pw/2, footerY+5, {align:"center"});

      doc.save(`${district}_HydroMind_CGWB2024_Report.pdf`);
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      alert("Error generating PDF: " + (err.message || "Unknown error"));
    } finally {
      setIsGenerating(false);
    }
  };

  const deficit = analysisData?.deficit ?? "—";
  const activeSensors = analysisData?.sensors ?? "—";
  const rainForecast = analysisData?.rain_forecast ?? "—";
  const category = analysisData?.category ?? "—";
  const stagePct = analysisData?.stage_pct ?? 0;
  const dataSources: string[] = analysisData?.data_sources ?? [];

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            AI District Analysis
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time insights using CGWB 2024 official data, 70-year GWL history, and live ESP32 IoT telemetry.
          </p>
          {dataSources.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Database className="h-3.5 w-3.5 text-muted-foreground" />
              {dataSources.map(s => (
                <span key={s} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full border">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 bg-white dark:bg-gray-900 p-2 rounded-lg shadow-sm border">
          <MapPin className="h-5 w-5 text-primary" />
          <Select value={district} onValueChange={setDistrict}>
            <SelectTrigger className="w-[200px] border-none shadow-none focus:ring-0">
              <SelectValue placeholder="Select District" />
            </SelectTrigger>
            <SelectContent>
              {districts.map(d => (
                <SelectItem key={d} value={d} className="font-medium">{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-[500px] items-center justify-center flex-col gap-4">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <BrainCircuit className="h-5 w-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 animate-pulse">Running 3-Agent AI Analysis...</p>
            <p className="text-xs text-muted-foreground mt-1">Root Cause · Risk Prediction · Policy Recommendation</p>
          </div>
        </div>
      ) : !district ? (
        <div className="flex h-[400px] flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl mt-6">
          <MapPin className="h-10 w-10 mb-4 opacity-20" />
          <p className="text-base font-medium text-gray-700 dark:text-gray-300">No district selected</p>
          <p className="text-sm opacity-70 mt-1 max-w-sm">Please select a district from the dropdown above to generate the full AI analysis report.</p>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">

          {/* CGWB Category Banner */}
          <div className={`flex items-center justify-between p-4 rounded-xl border-2 ${categoryColors[category] ?? "border-gray-200 bg-gray-50"}`}>
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-6 w-6" />
              <div>
                <p className="font-bold text-base">{district} — CGWB 2024 Category: {category}</p>
                <p className="text-xs opacity-75 mt-0.5">
                  Stage of Groundwater Extraction: <span className="font-bold">{stagePct.toFixed(1)}%</span>
                  {stagePct > 100 && " • Annual extraction EXCEEDS recharge — CRITICAL"}
                  {stagePct > 70 && stagePct <= 100 && " • Approaching over-exploitation threshold"}
                  {stagePct <= 70 && " • Within sustainable limits"}
                </p>
              </div>
            </div>
            <span className={categoryBadge(category)}>{category}</span>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 flex items-center gap-3 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-transparent border-blue-100 dark:border-blue-900/50">
              <div className="p-2.5 bg-blue-500/10 rounded-full text-blue-600 dark:text-blue-400 flex-shrink-0">
                <Droplets className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Aquifer Deficit</p>
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{deficit}</h4>
                <p className="text-xs text-muted-foreground">vs. safe threshold</p>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-3 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-transparent border-emerald-100 dark:border-emerald-900/50">
              <div className="p-2.5 bg-emerald-500/10 rounded-full text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">IoT Sensors</p>
                <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">{activeSensors}</h4>
                <p className="text-xs text-muted-foreground">Field online</p>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-3 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-transparent border-indigo-100 dark:border-indigo-900/50">
              <div className="p-2.5 bg-indigo-500/10 rounded-full text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                <CloudRain className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Rain Forecast (30d)</p>
                <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">{rainForecast}</h4>
                <p className="text-xs text-muted-foreground">IMD Normal</p>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-3 bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/20 dark:to-transparent border-violet-100 dark:border-violet-900/50">
              <div className="p-2.5 bg-violet-500/10 rounded-full text-violet-600 dark:text-violet-400 flex-shrink-0">
                <BarChart2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">GW Stage (CGWB 2024)</p>
                <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">{stagePct.toFixed(1)}%</h4>
                <p className="text-xs text-muted-foreground">Safe &lt; 70%</p>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart */}
            <Card className="p-6 lg:col-span-2 flex flex-col shadow-md border-gray-200/60 dark:border-gray-800">
              <div className="mb-4 flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800 dark:text-gray-100">
                    <TrendingDown className="h-5 w-5 text-blue-500" />
                    Groundwater Depth Forecast — {district}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Linear trend extrapolation using CGWB 1991–2020 dataset to predict 60m crisis timeline.
                  </p>
                </div>
                <span className="bg-blue-500/10 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-semibold border border-blue-200 dark:border-blue-800">
                  ML Forecast
                </span>
              </div>

              <div ref={chartRef} className="flex-1 w-full bg-white dark:bg-card">
                <DistrictForecastChart district={district} hideKpis={true} height={320} />
              </div>
            </Card>

            {/* AI Panels */}
            <div className="flex flex-col gap-4">
              <Card className="p-5 flex-1 shadow-md border-blue-100 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-transparent dark:border-blue-900/50">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="bg-blue-600 text-white p-2 rounded-lg shadow-sm">
                    <BrainCircuit className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-blue-950 dark:text-blue-100">AI Root Cause Agent</h3>
                    <p className="text-xs text-blue-500 font-medium">Gemini 1.5 Flash · CGWB 2024</p>
                  </div>
                </div>
                <p className="text-sm text-blue-900/80 dark:text-blue-200/80 leading-relaxed">
                  {analysisData?.reason || "No analysis available."}
                </p>
              </Card>

              <Card className="p-5 flex-1 shadow-md border-amber-200 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-transparent dark:border-amber-900/50">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="bg-amber-500 text-white p-2 rounded-lg shadow-sm">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-950 dark:text-amber-100">Predictive Alert</h3>
                    <p className="text-xs text-amber-600 font-medium">30-Day Risk Forecast</p>
                  </div>
                </div>
                <p className="text-sm text-amber-900/90 dark:text-amber-200/80 leading-relaxed">
                  {analysisData?.prediction || "No prediction available."}
                </p>
              </Card>

              <Button
                onClick={handleDownload}
                disabled={!analysisData || isGenerating}
                className="w-full shadow-lg hover:shadow-xl transition-all h-11 font-semibold"
                size="lg"
              >
                {isGenerating ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating PDF...</>
                ) : (
                  <><Download className="mr-2 h-4 w-4" />Download CGWB AI Report (PDF)</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
