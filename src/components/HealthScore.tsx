import { cn } from "@/lib/utils";
import { severityFromScore } from "@/lib/metrics";

const LABELS: Record<ReturnType<typeof severityFromScore>, string> = {
  excellent: "Excellent",
  good: "Bon",
  fair: "Moyen",
  degraded: "Dégradé",
  critical: "Critique",
};

export function HealthScore({ score }: { score: number }) {
  const sev = severityFromScore(score);
  const color =
    sev === "excellent" || sev === "good"
      ? "text-success"
      : sev === "fair"
        ? "text-warning"
        : sev === "degraded"
          ? "text-orange-400"
          : "text-critical";
  const ring =
    sev === "excellent" || sev === "good"
      ? "stroke-success"
      : sev === "fair"
        ? "stroke-warning"
        : sev === "degraded"
          ? "stroke-orange-400"
          : "stroke-critical";

  const c = 2 * Math.PI * 52;
  const offset = c - (score / 100) * c;

  return (
    <div className="surface-card flex items-center gap-6 rounded-xl border border-border/60 p-6">
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r="52" strokeWidth="10" className="fill-none stroke-secondary" />
          <circle
            cx="60"
            cy="60"
            r="52"
            strokeWidth="10"
            strokeLinecap="round"
            className={cn("fill-none transition-all duration-700", ring)}
            strokeDasharray={c}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className={cn("text-3xl font-semibold tabular-nums", color)}>{score}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">/ 100</div>
          </div>
        </div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Santé globale</div>
        <div className={cn("mt-1 text-2xl font-semibold tracking-tight", color)}>{LABELS[sev]}</div>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Score calculé en temps réel à partir du CPU, de la mémoire, du stockage, de la température
          et du réseau.
        </p>
      </div>
    </div>
  );
}
