import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listDiagnoses } from "@/lib/diagnose.functions";
import { severityFromScore } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, FileSearch, Minus } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "Historique — PC Diagnostic AI" }] }),
  component: HistoryPage,
});

const SEV_LABEL: Record<ReturnType<typeof severityFromScore>, string> = {
  excellent: "Excellent",
  good: "Bon",
  fair: "Moyen",
  degraded: "Dégradé",
  critical: "Critique",
};

function HistoryPage() {
  const fetchList = useServerFn(listDiagnoses);
  const { data, isLoading, error } = useQuery({
    queryKey: ["diagnoses"],
    queryFn: () => fetchList(),
  });

  // Build chronological series for the sparkline (oldest → newest)
  const series = (data ?? [])
    .slice()
    .reverse()
    .map((d, i) => ({
      i,
      score: d.health_score,
      label: new Date(d.created_at).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));

  const avg = series.length
    ? Math.round(series.reduce((s, p) => s + p.score, 0) / series.length)
    : 0;
  const min = series.length ? Math.min(...series.map((p) => p.score)) : 0;
  const max = series.length ? Math.max(...series.map((p) => p.score)) : 0;

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Historique des diagnostics</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Suivez l'évolution de la santé de votre machine au fil du temps.
      </p>

      {series.length > 1 && (
        <div className="mt-6 grid gap-5 md:grid-cols-[2fr_1fr]">
          <div className="surface-card rounded-xl border border-border/60 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-tight">Évolution du score</h2>
              <span className="text-xs text-muted-foreground">{series.length} mesures</span>
            </div>
            <div className="mt-3 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 md:grid-cols-1">
            <Stat label="Moyenne" value={avg} />
            <Stat label="Pire" value={min} />
            <Stat label="Meilleur" value={max} />
          </div>
        </div>
      )}

      <div className="mt-6 surface-card rounded-xl border border-border/60">
        {isLoading && (
          <div className="p-10 text-center text-sm text-muted-foreground">Chargement…</div>
        )}
        {error && (
          <div className="p-10 text-center text-sm text-critical">
            Erreur : {(error as Error).message}
          </div>
        )}
        {!isLoading && !error && (data?.length ?? 0) === 0 && (
          <div className="grid place-items-center p-14 text-center">
            <FileSearch className="h-10 w-10 text-muted-foreground" />
            <h2 className="mt-3 text-lg font-medium">Aucun diagnostic pour l'instant</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Lancez votre premier diagnostic depuis le dashboard.
            </p>
          </div>
        )}
        {data && data.length > 0 && (
          <ul className="divide-y divide-border/60">
            {data.map((d, idx) => {
              const sev = severityFromScore(d.health_score);
              const tone =
                sev === "excellent" || sev === "good"
                  ? "text-success"
                  : sev === "fair"
                    ? "text-warning"
                    : sev === "degraded"
                      ? "text-orange-400"
                      : "text-critical";
              // Compare with the previous entry in chronological order
              const prev = data[idx + 1];
              const delta = prev ? d.health_score - prev.health_score : 0;
              return (
                <li key={d.id} className="flex items-start gap-4 px-5 py-4">
                  <div
                    className={cn(
                      "grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-secondary text-sm font-semibold tabular-nums",
                      tone,
                    )}
                  >
                    {d.health_score}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("text-xs font-medium uppercase tracking-wide", tone)}>
                        {SEV_LABEL[sev]}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(d.created_at).toLocaleString("fr-FR")}
                      </span>
                      {prev && <DeltaBadge delta={delta} />}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm">{d.summary}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface-card rounded-xl border border-border/60 p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-secondary/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
        <Minus className="h-3 w-3" /> stable
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
        up
          ? "border-success/30 bg-success/10 text-success"
          : "border-critical/30 bg-critical/10 text-critical",
      )}
    >
      {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {up ? "+" : ""}
      {delta} pts
    </span>
  );
}
