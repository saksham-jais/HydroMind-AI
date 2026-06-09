import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { trendData } from "@/lib/mock-data";

export function TrendChart({ height = 280 }: { height?: number }) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={trendData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="lvlGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} unit=" ft" />
          <Tooltip
            contentStyle={{
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v) => [`${v} ft`, "Depth"]}
          />
          <Area type="monotone" dataKey="level" stroke="var(--color-accent)" strokeWidth={2} fill="url(#lvlGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
