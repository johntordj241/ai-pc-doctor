import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  unit?: string;
  detail?: string;
  percent?: number; // 0..100 for the gauge bar
  tone?: "default" | "success" | "warning" | "critical";
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  unit,
  detail,
  percent,
  tone = "default",
}: MetricCardProps) {
  const toneClass =
    tone === "critical"
      ? "text-critical"
      : tone === "warning"
        ? "text-warning"
        : tone === "success"
          ? "text-success"
          : "text-primary";
  const barClass =
    tone === "critical"
      ? "bg-critical"
      : tone === "warning"
        ? "bg-warning"
        : tone === "success"
          ? "bg-success"
          : "bg-primary";

  return (
    <div className="surface-card rounded-xl border border-border/60 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <Icon className={cn("h-4 w-4", toneClass)} /> {label}
        </div>
        {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold tracking-tight tabular-nums">{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      {typeof percent === "number" && (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className={cn("h-full rounded-full transition-all duration-500", barClass)}
            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
          />
        </div>
      )}
    </div>
  );
}
