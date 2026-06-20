import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { computeHealthScore, type SystemSnapshot } from "@/lib/metrics";
import { runDiagnosis, type Analysis } from "@/lib/diagnose.functions";
import { MetricCard } from "@/components/MetricCard";
import { ProcessTable } from "@/components/ProcessTable";
import { HealthScore } from "@/components/HealthScore";
import { DiagnosisCard } from "@/components/DiagnosisCard";
import { SourceBadge } from "@/components/SourceBadge";
import { AlertBanner } from "@/components/AlertBanner";
import { useSnapshot } from "@/hooks/use-snapshot";
import { ChatPanel } from "@/components/ChatPanel";
import { useAutoDiagnose } from "@/hooks/use-auto-diagnose";
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Wifi,
  Thermometer,
  Gauge,
  Sparkles,
  Loader2,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Dashboard — PC Diagnostic AI" },
      {
        name: "description",
        content: "Surveillez les performances et identifiez les ralentissements en un clic.",
      },
    ],
  }),
  component: AppPage,
});

const SCHEDULE_KEY = "pcd:autoSchedule";
const SCHEDULE_MS = 30 * 60 * 1000;

function AppPage() {
  const { snapshot, source, error } = useSnapshot(2000);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzedSnapshot, setAnalyzedSnapshot] = useState<SystemSnapshot | null>(null);
  const [analyzedScore, setAnalyzedScore] = useState<number | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [lastRunAt, setLastRunAt] = useState<Date | null>(null);
  const [scheduleEnabled, setScheduleEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SCHEDULE_KEY) === "1";
  });
  const diagnose = useServerFn(runDiagnosis);
  const queryClient = useQueryClient();
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SCHEDULE_KEY, scheduleEnabled ? "1" : "0");
    }
  }, [scheduleEnabled]);

  const runDiagnose = async (reason: "alert" | "scheduled" | "manual") => {
    if (diagnosing) return;
    if (source !== "electron") {
      toast.error("Diagnostic indisponible en mode démo", {
        description: "Installez l'application Desktop (Electron) pour analyser votre vrai PC.",
      });
      return;
    }
    setDiagnosing(true);
    if (reason === "manual") setAnalysis(null);
    const snap = snapshotRef.current;
    try {
      const res = await diagnose({ data: { snapshot: snap } });
      setAnalysis(res.analysis);
      setAnalyzedSnapshot(snap);
      setAnalyzedScore(res.healthScore);
      setLastRunAt(new Date());
      queryClient.invalidateQueries({ queryKey: ["diagnoses"] });
      if (reason === "scheduled")
        toast("Analyse planifiée terminée", { description: res.analysis.summary });
      else if (reason === "alert")
        toast.warning("Alerte analysée par l'IA", { description: res.analysis.summary });
      else toast.success("Diagnostic terminé");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur de diagnostic");
    } finally {
      setDiagnosing(false);
    }
  };

  const { alerts, secondsLeft, diagnoseNow, dismiss } = useAutoDiagnose({
    snapshot,
    onDiagnose: runDiagnose,
    alertCountdownSec: 10,
    scheduledIntervalMs: SCHEDULE_MS,
    scheduleEnabled,
  });

  const ramPct = (snapshot.ram.usedGb / snapshot.ram.totalGb) * 100;
  const tone = (v: number, warn = 70, crit = 90) =>
    v >= crit ? "critical" : v >= warn ? "warning" : v >= 40 ? "default" : "success";

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <SourceBadge source={source} error={error} />
            <span className="text-xs text-muted-foreground">
              {snapshot.os.name} {snapshot.os.version} · MAJ{" "}
              {new Date(snapshot.takenAt).toLocaleTimeString()}
            </span>
          </div>
          <ScheduleToggle
            enabled={scheduleEnabled}
            onChange={setScheduleEnabled}
            lastRunAt={lastRunAt}
          />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Pourquoi mon ordinateur est lent <span className="text-gradient">maintenant ?</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Mesure en temps réel. Lancez un diagnostic pour obtenir une explication claire et des
          actions concrètes.
        </p>
      </div>

      {alerts.length > 0 && (
        <div className="mt-6">
          <AlertBanner
            alerts={alerts}
            secondsLeft={secondsLeft}
            onDiagnoseNow={() => void diagnoseNow()}
            onDismiss={dismiss}
          />
        </div>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_auto]">
        <HealthScore score={computeHealthScore(snapshot)} />
        <DiagnoseButton
          onClick={() => void runDiagnose("manual")}
          loading={diagnosing}
          disabled={source !== "electron"}
        />
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <MetricCard
          icon={Cpu}
          label="CPU"
          value={snapshot.cpu.usage.toFixed(1)}
          unit="%"
          detail={`${snapshot.cpu.cores} cœurs · ${snapshot.cpu.frequencyGhz} GHz`}
          percent={snapshot.cpu.usage}
          tone={tone(snapshot.cpu.usage)}
        />
        <MetricCard
          icon={MemoryStick}
          label="RAM"
          value={snapshot.ram.usedGb.toFixed(1)}
          unit={`/ ${snapshot.ram.totalGb} Go`}
          detail={`${ramPct.toFixed(0)}%`}
          percent={ramPct}
          tone={tone(ramPct)}
        />
        <MetricCard
          icon={Gauge}
          label="GPU"
          value={String(snapshot.gpu.usage)}
          unit="%"
          detail={`${snapshot.gpu.vramUsedGb} / ${snapshot.gpu.vramTotalGb} Go VRAM`}
          percent={snapshot.gpu.usage}
          tone={tone(snapshot.gpu.usage)}
        />
        <MetricCard
          icon={HardDrive}
          label="Disque"
          value={String(snapshot.disk.usagePercent)}
          unit="%"
          detail={
            snapshot.disk.healthPercent == null
              ? `R: ${snapshot.disk.readMBs} / W: ${snapshot.disk.writeMBs} MB/s · SMART: Inconnu`
              : `R: ${snapshot.disk.readMBs} / W: ${snapshot.disk.writeMBs} MB/s · SMART ${snapshot.disk.healthPercent}%`
          }
          percent={snapshot.disk.usagePercent}
          tone={tone(snapshot.disk.usagePercent, 80, 92)}
        />
        <MetricCard
          icon={Wifi}
          label="Réseau"
          value={String(snapshot.network.latencyMs)}
          unit="ms"
          detail={`↓ ${snapshot.network.downMbps} · ↑ ${snapshot.network.upMbps} Mb/s`}
          percent={Math.min(100, snapshot.network.latencyMs)}
          tone={tone(snapshot.network.latencyMs, 60, 100)}
        />
        <MetricCard
          icon={Thermometer}
          label="CPU °C"
          value={String(snapshot.cpu.temperature)}
          unit="°C"
          detail={snapshot.cpu.temperature > 80 ? "Thermal throttling possible" : "Normale"}
          percent={Math.min(100, snapshot.cpu.temperature)}
          tone={tone(snapshot.cpu.temperature, 75, 88)}
        />
      </section>

      {analysis && (
        <section className="mt-8">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Diagnostic IA
            </h2>
          </div>
          <DiagnosisCard
            analysis={analysis}
            snapshot={analyzedSnapshot ?? undefined}
            healthScore={analyzedScore ?? undefined}
          />
        </section>
      )}

      <section className="mt-8">
        <ProcessTable processes={snapshot.processes} />
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Assistant IA
          </h2>
        </div>
        <ChatPanel snapshot={snapshot} analysis={analysis} />
      </section>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        {source === "electron"
          ? "Mesures réelles collectées par l'agent local via systeminformation."
          : "Mode démo : métriques simulées dans le navigateur. Installez l'application desktop (npm run electron:dev) pour mesurer votre vrai PC."}
      </p>
    </main>
  );
}

function ScheduleToggle({
  enabled,
  onChange,
  lastRunAt,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  lastRunAt: Date | null;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border/60 bg-secondary/40 px-3 py-1.5 text-xs">
      <CalendarClock className="h-3.5 w-3.5 text-primary" />
      <span className="font-medium">Auto-analyse 30 min</span>
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-primary"
      />
      {enabled && (
        <span className="text-muted-foreground">
          {lastRunAt ? `dernière : ${lastRunAt.toLocaleTimeString()}` : "en attente"}
        </span>
      )}
    </label>
  );
}

function DiagnoseButton({
  onClick,
  loading,
  disabled,
}: {
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
}) {
  const blocked = !!disabled;
  return (
    <button
      onClick={onClick}
      disabled={loading || blocked}
      title={
        blocked ? "Diagnostic réel disponible uniquement dans l'application Desktop." : undefined
      }
      className={cn(
        "group relative grid h-full min-h-[140px] place-items-center rounded-xl border border-primary/30 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent px-8 py-6 text-left transition hover:border-primary/60 disabled:opacity-60 disabled:cursor-not-allowed",
        loading && "animate-scan overflow-hidden",
      )}
    >
      <span
        className={cn(
          "absolute -inset-0.5 -z-10 rounded-xl opacity-0 blur-xl transition group-hover:opacity-60",
          "bg-gradient-to-r from-primary to-[color:var(--primary-glow)]",
        )}
      />
      <div className="flex items-center gap-4">
        <span
          className={cn(
            "grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground",
            !loading && !blocked && "animate-pulse-ring",
          )}
        >
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <Sparkles className="h-6 w-6" />
          )}
        </span>
        <div>
          <div className="text-xs uppercase tracking-wider text-primary">
            {loading
              ? "Analyse en cours…"
              : blocked
                ? "Indisponible en mode démo"
                : "Action principale"}
          </div>
          <div className="mt-1 text-xl font-semibold tracking-tight">
            {loading
              ? "Le médecin IA examine votre PC"
              : blocked
                ? "Installez l'app Desktop"
                : "Pourquoi ça rame ?"}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {blocked
              ? "Le diagnostic IA n'analyse jamais de données simulées."
              : "CPU · RAM · Disque · Réseau · Température"}
          </div>
        </div>
      </div>
    </button>
  );
}
