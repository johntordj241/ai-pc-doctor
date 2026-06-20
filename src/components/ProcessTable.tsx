import type { ProcessInfo } from "@/lib/metrics";
import { cn } from "@/lib/utils";

const TONE: Record<ProcessInfo["impact"], string> = {
  low: "bg-success/15 text-success border-success/30",
  medium: "bg-warning/15 text-warning border-warning/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  critical: "bg-critical/15 text-critical border-critical/30",
};
const LABEL: Record<ProcessInfo["impact"], string> = {
  low: "Faible",
  medium: "Moyen",
  high: "Élevé",
  critical: "Critique",
};

export function ProcessTable({ processes }: { processes: ProcessInfo[] }) {
  return (
    <div className="surface-card overflow-hidden rounded-xl border border-border/60">
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
        <h3 className="text-sm font-semibold tracking-tight">Processus actifs</h3>
        <span className="text-xs text-muted-foreground">{processes.length} processus</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-2.5 text-left font-medium">Nom</th>
              <th className="px-3 py-2.5 text-right font-medium">CPU</th>
              <th className="px-3 py-2.5 text-right font-medium">RAM</th>
              <th className="px-3 py-2.5 text-right font-medium">Disque</th>
              <th className="px-5 py-2.5 text-right font-medium">Impact</th>
            </tr>
          </thead>
          <tbody>
            {processes.slice(0, 10).map((p) => (
              <tr
                key={p.pid}
                className="border-b border-border/40 last:border-0 hover:bg-secondary/40"
              >
                <td className="px-5 py-2.5 font-medium">{p.name}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{p.cpu.toFixed(1)}%</td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {(p.ram / 1024).toFixed(2)} Go
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                  {p.disk.toFixed(1)} MB/s
                </td>
                <td className="px-5 py-2.5 text-right">
                  <span
                    className={cn(
                      "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
                      TONE[p.impact],
                    )}
                  >
                    {LABEL[p.impact]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
