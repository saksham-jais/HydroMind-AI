import { villages, riskLevel } from "@/lib/mock-data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function VillageTable({ limit }: { limit?: number }) {
  const rows = [...villages].sort((a, b) => b.riskScore - a.riskScore).slice(0, limit);
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
