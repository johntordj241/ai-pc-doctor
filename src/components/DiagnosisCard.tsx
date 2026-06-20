import type { Analysis } from "@/lib/diagnose.functions";
import type { SystemSnapshot } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, ShieldAlert, Zap, Clock, FileDown, Info } from "lucide-react";
import { downloadDiagnosisPdf } from "@/lib/pdf-report";
import { toast } from "sonner";

const SEVERITY: Record<
  Analysis["severity"],
  { label: string; class: string; Icon: typeof CheckCircle2 }
> = {
  low: {
    label: "Faible",
    class: "bg-success/15 text-success border-success/30",
    Icon: CheckCircle2,
  },
  medium: {
    label: "Moyenne",
    class: "bg-warning/15 text-warning border-warning/30",
    Icon: AlertTriangle,
  },
  high: {
    label: "Importante",
    class: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    Icon: AlertTriangle,
  },
  critical: {
    label: "Critique",
    class: "bg-critical/15 text-critical border-critical/30",
    Icon: ShieldAlert,
  },
};
const CONFIDENCE: Record<Analysis["confidence"], { label: string; pct: number; tone: string }> = {
  low: { label: "Faible", pct: 35, tone: "text-warning" },
  medium: { label: "Moyenne", pct: 60, tone: "text-warning" },
  high: { label: "Élevée", pct: 82, tone: "text-success" },
  very_high: { label: "Très élevée", pct: 95, tone: "text-success" },
};
const RISK: Record<"low" | "medium" | "high", string> = {
  low: "text-success",
  medium: "text-warning",
  high: "text-critical",
};

interface Props {
  analysis: Analysis;
  snapshot?: SystemSnapshot;
  healthScore?: number;
}

export function DiagnosisCard({ analysis, snapshot, healthScore }: Props) {
  const sev = SEVERITY[analysis.severity];
  const conf = CONFIDENCE[analysis.confidence];
  const canExport = !!snapshot && typeof healthScore === "number";

  const onDownload = () => {
    if (!canExport) return;
    try {
      downloadDiagnosisPdf({ analysis, snapshot: snapshot!, healthScore: healthScore! });
      toast.success("Rapport PDF téléchargé");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Échec de l'export PDF");
    }
  };

  return (
    <div className="space-y-5">
      <div className="surface-card rounded-xl border border-border/60 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium",
                sev.class,
              )}
            >
              <sev.Icon className="h-3.5 w-3.5" /> Gravité {sev.label}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-secondary/50 px-2.5 py-1 text-xs",
                conf.tone,
              )}
            >
              Confiance : {conf.label}
            </span>
          </div>
          {canExport && (
            <button
              onClick={onDownload}
              className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-medium hover:bg-secondary"
            >
              <FileDown className="h-3.5 w-3.5" /> Télécharger le rapport PDF
            </button>
          )}
        </div>

        <h3 className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">
          Résumé exécutif
        </h3>
        <p className="mt-2 text-lg leading-relaxed">{analysis.summary}</p>

        {/* Confidence bar + reason */}
        <div className="mt-5 rounded-lg border border-border/60 bg-background/40 p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
              <Info className="h-3.5 w-3.5" /> Niveau de confiance
            </span>
            <span className={cn("font-semibold tabular-nums", conf.tone)}>{conf.pct}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                conf.pct >= 75 ? "bg-success" : conf.pct >= 50 ? "bg-warning" : "bg-orange-400",
              )}
              style={{ width: `${conf.pct}%` }}
            />
          </div>
          {analysis.confidenceReason && (
            <p className="mt-2 text-xs text-muted-foreground">{analysis.confidenceReason}</p>
          )}
        </div>

        {/* Triggers — what made the AI conclude this */}
        {analysis.triggers?.length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Métriques déclenchantes
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {analysis.triggers.map((t, i) => (
                <span
                  key={i}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs",
                    t.severity === "critical"
                      ? "border-critical/30 bg-critical/10 text-critical"
                      : t.severity === "warning"
                        ? "border-warning/30 bg-warning/10 text-warning"
                        : "border-border/60 bg-secondary/50 text-muted-foreground",
                  )}
                  title={`Seuil: ${t.threshold}`}
                >
                  <span className="font-medium">{t.metric}</span>
                  <span className="tabular-nums opacity-90">{t.value}</span>
                  <span className="opacity-60">/ {t.threshold}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="surface-card rounded-xl border border-border/60 p-6">
          <h3 className="text-sm font-semibold tracking-tight">Causes principales</h3>
          <div className="mt-4 space-y-3">
            {analysis.causes.map((c, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{c.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {Math.round(c.weightPercent)}%
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-[color:var(--primary-glow)]"
                    style={{ width: `${c.weightPercent}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">{c.explanation}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card rounded-xl border border-border/60 p-6">
          <h3 className="text-sm font-semibold tracking-tight">Recommandations</h3>
          <div className="mt-4 space-y-3">
            {analysis.recommendations.map((r, i) => (
              <div key={i} className="rounded-lg border border-border/60 bg-background/40 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">{r.title}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{r.description}</p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1 text-success">
                    <Zap className="h-3 w-3" /> {r.estimatedGain}
                  </span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" /> {r.timeMinutes} min
                  </span>
                  <span className={cn("inline-flex items-center gap-1", RISK[r.risk])}>
                    ● Risque {r.risk === "low" ? "faible" : r.risk === "medium" ? "moyen" : "élevé"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
