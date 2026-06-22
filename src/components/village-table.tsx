import { riskLevel, villages as mockVillages } from "@/lib/mock-data";
import { api } from "@/lib/api/client";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function VillageTable({ limit, search = "" }: { limit?: number; search?: string }) {
  const { data: villages = mockVillages } = useQuery({
    queryKey: ["villages"],
    queryFn: () => api.villages(),
    refetchInterval: 2000,
    initialData: mockVillages
  });

  const q = search.toLowerCase().trim();
  const filtered = villages.filter(v => {
    if (!q) return true;
    return v.name.toLowerCase().includes(q) || v.id.toLowerCase() === q;
  });
  const rows = [...filtered].sort((a, b) => b.riskScore - a.riskScore).slice(0, limit);
  return (
    <div className="rounded-md border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-12">#</TableHead>
            <TableHead>Village</TableHead>
            <TableHead>District</TableHead>
            <TableHead className="text-right">Water Level</TableHead>
            <TableHead className="text-right">Risk</TableHead>
            <TableHead>Predicted Crisis</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((v, i) => {
            const lvl = riskLevel(v.riskScore);
            return (
              <TableRow key={v.id} className="hover:bg-muted/40">
                <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="font-medium">{v.name}</TableCell>
                <TableCell className="text-muted-foreground">{v.district}</TableCell>
                <TableCell className="text-right tabular-nums">{v.waterLevel} ft</TableCell>
                <TableCell className="text-right tabular-nums font-semibold">{v.riskScore}%</TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {new Date(v.predictedCrisisDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "border-transparent text-xs",
                      lvl === "critical" && "bg-critical/15 text-critical",
                      lvl === "warning" && "bg-warning/20 text-warning",
                      lvl === "safe" && "bg-safe/15 text-safe",
                    )}
                  >
                    {lvl.toUpperCase()}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
