import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API_BASE } from "@/lib/api/client";
import { Loader2, BrainCircuit } from "lucide-react";

export function TrendChart({ height = 280 }: { height?: number }) {
  const [startYear, setStartYear] = useState("1991");
  const [endYear, setEndYear] = useState("2020");
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);

  const { data: trendData, isLoading } = useQuery({
    queryKey: ["stateTrend", startYear, endYear],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/analysis/state-trend?start_year=${startYear}&end_year=${endYear}`);
      if (!res.ok) throw new Error("Failed to fetch trend");
      return res.json();
    },
    staleTime: 5 * 60_000, // 5 minutes — historical data never changes
  });

  const years = Array.from({ length: 2020 - 1950 + 1 }, (_, i) => (1950 + i).toString());
  
  const totalMonths = (parseInt(endYear) - parseInt(startYear) + 1) * 12;

  const handleChartClick = (state: any) => {
    if (!state || !state.activeLabel) return;
    const month = state.activeLabel;
    
    if (selectedMonths.includes(month)) {
      setSelectedMonths(selectedMonths.filter(m => m !== month));
    } else {
      if (selectedMonths.length < 2) {
        setSelectedMonths([...selectedMonths, month].sort((a, b) => {
          const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          return m.indexOf(a) - m.indexOf(b);
        }));
      } else {
        setSelectedMonths([month]);
      }
    }
  };

  // Calculate stats for AI insight
  const insight = useMemo(() => {
    if (!trendData || trendData.length === 0) return null;

    if (selectedMonths.length === 2) {
      const p1 = trendData.find((d: any) => d.month === selectedMonths[0]);
      const p2 = trendData.find((d: any) => d.month === selectedMonths[1]);
      if (p1 && p2) {
        const diff = Math.abs(p2.level) - Math.abs(p1.level);
        
        if (Math.abs(diff) < 0.5) {
          return `Analyzing the selected range from ${selectedMonths[0]} to ${selectedMonths[1]}: The average groundwater level remained relatively stable, fluctuating by only ${(Math.abs(diff) * 3.28084).toFixed(1)}ft (holding near ${(Math.abs(p1.level) * 3.28084).toFixed(1)}ft below ground). This stabilization typically indicates a period where natural recharge and human extraction are relatively balanced, such as the post-monsoon resting phase.`;
        }
        
        const action = diff > 0 ? "declined" : "recovered";
        const reason = diff > 0 
          ? "heavy agricultural extraction, particularly for the dry season (summer/Rabi crops), combined with high evaporation rates"
          : "rapid natural recharge driven by intense monsoon precipitation and surface runoff soaking into the aquifers";
        
        return `Analyzing the selected range from ${selectedMonths[0]} to ${selectedMonths[1]}: The average groundwater level ${action} by ${(Math.abs(diff) * 3.28084).toFixed(1)}ft (moving from ${(Math.abs(p1.level) * 3.28084).toFixed(1)}ft to ${(Math.abs(p2.level) * 3.28084).toFixed(1)}ft below ground). This is primarily driven by ${reason}.`;
      }
    }

    let maxDepth = 0;
    let minDepth = 999;
    trendData.forEach((d: any) => {
      const absLvl = Math.abs(d.level);
      if (absLvl > maxDepth) maxDepth = absLvl;
      if (absLvl < minDepth) minDepth = absLvl;
    });
    
    return `Between ${startYear} and ${endYear}, the state average shows a peak depletion dropping to ${(maxDepth * 3.28084).toFixed(1)}ft below ground during the summer (May–June) due to intensive agricultural extraction. The aquifers subsequently recharge during the July–September monsoon, recovering to ${(minDepth * 3.28084).toFixed(1)}ft. Click any two points on the chart to analyze a specific period!`;
  }, [trendData, selectedMonths, startYear, endYear]);

  return (
    <div className="flex flex-col gap-4 -mt-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Water Level Trend — State Average</h3>
          <p className="text-xs text-muted-foreground">Depth below ground (feet), {startYear} to {endYear} ({totalMonths} months)</p>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Recharts</span>
      </div>

      <div className="flex items-center gap-4 px-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">From:</span>
          <Select value={startYear} onValueChange={setStartYear}>
            <SelectTrigger className="h-8 w-[90px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">To:</span>
          <Select value={endYear} onValueChange={setEndYear}>
            <SelectTrigger className="h-8 w-[90px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div style={{ width: "100%", height }} className="relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-black/50 rounded-md">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        <ResponsiveContainer>
        <AreaChart data={trendData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
          <defs>
            <linearGradient id="lvlGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} 
              tickFormatter={(v) => `${Math.round(Math.abs(v) * 3.28084)}ft`} />
            <Tooltip
              contentStyle={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: any) => [`${(Math.abs(v) * 3.28084).toFixed(1)} ft`, "Avg Depth"]}
            />
          {selectedMonths.map(m => (
            <ReferenceLine key={m} x={m} stroke="var(--color-primary)" strokeDasharray="3 3" strokeWidth={2} />
          ))}
          <Area type="monotone" dataKey="level" stroke="var(--color-primary)" strokeWidth={2} fill="url(#lvlGrad)" />
        </AreaChart>
      </ResponsiveContainer>
      </div>

      {insight && (
        <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50/50 p-3 dark:border-blue-900/30 dark:bg-blue-950/20 transition-all duration-300">
          <div className="mb-1 flex items-center gap-1.5">
            <BrainCircuit className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-semibold text-blue-900 dark:text-blue-300">
              {selectedMonths.length === 2 ? "Interactive Range Analysis" : "AI Context Analysis"}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-blue-800/80 dark:text-blue-200/70">
            {insight}
          </p>
        </div>
      )}
    </div>
  );
}
