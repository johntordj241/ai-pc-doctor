import { useEffect, useState } from "react";
import { CircleAlert, ShieldAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Alert } from "@/lib/alerts";

interface Props {
  alerts: Alert[];
  /** Seconds left before auto-triggering the AI diagnosis. null = no pending action. */
  secondsLeft: number | null;
  onDiagnoseNow: () => void;
  onDismiss: () => void;
}

export function AlertBanner({ alerts, secondsLeft, onDiagnoseNow, onDismiss }: Props) {
  if (alerts.length === 0) return null;
  const hasCritical = alerts.some((a) => a.severity === "critical");
  return (
    <div
      className={cn(
        "surface-card rounded-xl border p-4 shadow-lg",
        hasCritical ? "border-critical/50 bg-critical/5" : "border-warning/50 bg-warning/5",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full",
            hasCritical ? "bg-critical/15 text-critical" : "bg-warning/15 text-warning",
          )}
        >
          {hasCritical ? <ShieldAlert className="h-5 w-5" /> : <CircleAlert className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">
                {alerts.length === 1
                  ? alerts[0].label
                  : `${alerts.length} causes probables détectées`}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {alerts.length === 1 ? alerts[0].detail : alerts.map((a) => a.label).join(" · ")}
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
              aria-label="Ignorer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {alerts.slice(0, 6).map((a, i) => (
              <span
                key={i}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
                  a.severity === "critical"
                    ? "border-critical/30 bg-critical/10 text-critical"
                    : "border-warning/30 bg-warning/10 text-warning",
                )}
                title={`${a.metric} ${a.value} (seuil ${a.threshold})`}
              >
                {a.metric}: {a.value}
              </span>
            ))}
          </div>

          {secondsLeft !== null && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2">
              <div className="text-xs text-muted-foreground">
                Recommandation IA dans{" "}
                <span className="font-semibold tabular-nums text-foreground">{secondsLeft}s</span>…
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onDismiss}
                  className="rounded-md border border-border/60 px-2.5 py-1 text-xs hover:bg-secondary"
                >
                  Annuler
                </button>
                <button
                  onClick={onDiagnoseNow}
                  className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
                >
                  Analyser maintenant
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
