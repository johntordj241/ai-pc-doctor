import { cn } from "@/lib/utils";
import { Activity, CircleAlert, Cpu } from "lucide-react";

export function SourceBadge({
  source,
  error,
}: {
  source: "electron" | "mock";
  error: string | null;
}) {
  if (source === "electron") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
        <Activity className="h-3 w-3" /> Données réelles · agent local
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        error
          ? "border-critical/30 bg-critical/10 text-critical"
          : "border-warning/30 bg-warning/10 text-warning",
      )}
      title={error ?? "Téléchargez l'application desktop pour mesurer votre vrai PC."}
    >
      {error ? <CircleAlert className="h-3 w-3" /> : <Cpu className="h-3 w-3" />}
      {error ? "Collecte indisponible" : "Mode démo · données simulées"}
    </span>
  );
}
