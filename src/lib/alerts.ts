// Local rule-based alert detector — runs in the browser on each snapshot.
// Emits "probable causes" without needing an AI call so we can warn fast.
import type { SystemSnapshot } from "./metrics";

export type AlertKind =
  | "cpu_saturation"
  | "ram_pressure"
  | "disk_saturation"
  | "thermal_throttling"
  | "gpu_saturation"
  | "network_latency";

export interface Alert {
  kind: AlertKind;
  label: string;
  detail: string;
  severity: "warning" | "critical";
  metric: string;
  value: string;
  threshold: string;
}

export function detectAlerts(s: SystemSnapshot): Alert[] {
  const out: Alert[] = [];
  const ramPct = (s.ram.usedGb / Math.max(0.01, s.ram.totalGb)) * 100;

  if (s.cpu.usage >= 90) {
    out.push({
      kind: "cpu_saturation",
      label: "CPU saturé",
      detail: "Le processeur tourne à pleine charge — l'ordinateur va sembler lent.",
      severity: s.cpu.usage >= 97 ? "critical" : "warning",
      metric: "CPU",
      value: `${s.cpu.usage.toFixed(0)}%`,
      threshold: "> 90%",
    });
  }
  if (ramPct >= 90) {
    out.push({
      kind: "ram_pressure",
      label: "Mémoire saturée",
      detail: "Plus assez de RAM libre, le système commence à utiliser le disque (swap).",
      severity: ramPct >= 97 ? "critical" : "warning",
      metric: "RAM",
      value: `${s.ram.usedGb.toFixed(1)}/${s.ram.totalGb} Go`,
      threshold: "> 90%",
    });
  }
  if (s.disk.usagePercent >= 92) {
    out.push({
      kind: "disk_saturation",
      label: "Disque presque plein",
      detail: "Moins de 8 % d'espace libre — Windows ralentit et les mises à jour échouent.",
      severity: s.disk.usagePercent >= 97 ? "critical" : "warning",
      metric: "Disque",
      value: `${s.disk.usagePercent}%`,
      threshold: "> 92%",
    });
  }
  if (s.cpu.temperature >= 85) {
    out.push({
      kind: "thermal_throttling",
      label: "Surchauffe CPU (thermal throttling probable)",
      detail: "Au-dessus de 85 °C le CPU réduit sa fréquence pour ne pas brûler — d'où la lenteur.",
      severity: s.cpu.temperature >= 95 ? "critical" : "warning",
      metric: "Température CPU",
      value: `${s.cpu.temperature}°C`,
      threshold: "> 85°C",
    });
  }
  if (s.gpu.usage >= 95) {
    out.push({
      kind: "gpu_saturation",
      label: "GPU saturé",
      detail: "Carte graphique au maximum — jeu, rendu vidéo ou IA gourmande en cours.",
      severity: "warning",
      metric: "GPU",
      value: `${s.gpu.usage}%`,
      threshold: "> 95%",
    });
  }
  if (s.network.latencyMs >= 150) {
    out.push({
      kind: "network_latency",
      label: "Réseau très lent",
      detail: "Latence anormalement haute — Wi-Fi faible, FAI surchargé ou VPN qui ralentit.",
      severity: s.network.latencyMs >= 300 ? "critical" : "warning",
      metric: "Latence réseau",
      value: `${s.network.latencyMs} ms`,
      threshold: "> 150 ms",
    });
  }
  return out;
}

export function alertSignature(alerts: Alert[]): string {
  return alerts
    .map((a) => a.kind)
    .sort()
    .join("|");
}
