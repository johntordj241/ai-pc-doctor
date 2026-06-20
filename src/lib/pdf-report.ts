// Client-side PDF generator for a diagnosis report.
// Uses jsPDF directly — no server roundtrip needed.
import { jsPDF } from "jspdf";
import type { Analysis } from "@/lib/diagnose.functions";
import type { SystemSnapshot } from "@/lib/metrics";

const SEV_LABEL: Record<Analysis["severity"], string> = {
  low: "Faible",
  medium: "Moyenne",
  high: "Importante",
  critical: "Critique",
};
const CONF_LABEL: Record<Analysis["confidence"], string> = {
  low: "Faible",
  medium: "Moyenne",
  high: "Élevée",
  very_high: "Très élevée",
};
const RISK_LABEL: Record<"low" | "medium" | "high", string> = {
  low: "faible",
  medium: "moyen",
  high: "élevé",
};

interface Options {
  analysis: Analysis;
  snapshot: SystemSnapshot;
  healthScore: number;
}

export function buildDiagnosisPdf({ analysis, snapshot, healthScore }: Options): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  let y = M;

  const ink = (r: number, g: number, b: number) => doc.setTextColor(r, g, b);
  const fill = (r: number, g: number, b: number) => doc.setFillColor(r, g, b);

  const newPageIfNeeded = (needed: number) => {
    if (y + needed > H - M) {
      doc.addPage();
      y = M;
    }
  };

  const writeWrapped = (
    text: string,
    size: number,
    opts?: { bold?: boolean; gap?: number; color?: [number, number, number] },
  ) => {
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.setFontSize(size);
    if (opts?.color) ink(...opts.color);
    else ink(20, 24, 36);
    const lines = doc.splitTextToSize(text, W - 2 * M) as string[];
    for (const line of lines) {
      newPageIfNeeded(size + 4);
      doc.text(line, M, y);
      y += size + 4;
    }
    y += opts?.gap ?? 0;
  };

  // Header
  fill(15, 23, 42);
  doc.rect(0, 0, W, 90, "F");
  ink(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("PC Diagnostic AI", M, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Rapport de diagnostic — analyse IA", M, 60);
  doc.text(new Date(snapshot.takenAt).toLocaleString("fr-FR"), W - M, 60, { align: "right" });
  y = 120;

  // Score + severity row
  fill(241, 245, 249);
  doc.roundedRect(M, y, W - 2 * M, 70, 6, 6, "F");
  ink(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text(String(healthScore), M + 16, y + 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  ink(100, 116, 139);
  doc.text("/ 100  Santé globale", M + 16, y + 60);

  ink(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Gravité : ${SEV_LABEL[analysis.severity]}`, M + 140, y + 28);
  doc.text(`Confiance : ${CONF_LABEL[analysis.confidence]}`, M + 140, y + 48);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  ink(71, 85, 105);
  const confLines = doc.splitTextToSize(
    analysis.confidenceReason ?? "",
    W - 2 * M - 320,
  ) as string[];
  doc.text(confLines.slice(0, 2), M + 320, y + 28);
  y += 90;

  // Summary
  writeWrapped("Résumé", 12, { bold: true, gap: 4, color: [15, 23, 42] });
  writeWrapped(analysis.summary, 11, { gap: 12, color: [51, 65, 85] });

  // Triggers
  if (analysis.triggers?.length) {
    writeWrapped("Pourquoi ce diagnostic — métriques déclenchantes", 12, {
      bold: true,
      gap: 6,
      color: [15, 23, 42],
    });
    for (const t of analysis.triggers) {
      newPageIfNeeded(38);
      const isCrit = t.severity === "critical";
      fill(isCrit ? 254 : 254, isCrit ? 226 : 243, isCrit ? 226 : 199);
      doc.roundedRect(M, y, W - 2 * M, 30, 4, 4, "F");
      ink(isCrit ? 153 : 146, isCrit ? 27 : 64, isCrit ? 27 : 14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`${t.metric}: ${t.value}`, M + 10, y + 13);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Seuil ${t.threshold} · sévérité ${t.severity}`, M + 10, y + 25);
      y += 36;
    }
    y += 6;
  }

  // Causes
  writeWrapped("Causes principales", 12, { bold: true, gap: 6, color: [15, 23, 42] });
  for (const c of analysis.causes) {
    newPageIfNeeded(54);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    ink(15, 23, 42);
    doc.text(`${c.label}  —  ${Math.round(c.weightPercent)}%`, M, y);
    y += 14;
    // bar
    fill(226, 232, 240);
    doc.roundedRect(M, y, W - 2 * M, 6, 3, 3, "F");
    fill(37, 99, 235);
    doc.roundedRect(
      M,
      y,
      ((W - 2 * M) * Math.min(100, Math.max(0, c.weightPercent))) / 100,
      6,
      3,
      3,
      "F",
    );
    y += 14;
    writeWrapped(c.explanation, 10, { gap: 8, color: [71, 85, 105] });
  }

  // Recommendations
  writeWrapped("Recommandations", 12, { bold: true, gap: 6, color: [15, 23, 42] });
  for (const r of analysis.recommendations) {
    newPageIfNeeded(60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    ink(15, 23, 42);
    doc.text(r.title, M, y);
    y += 14;
    writeWrapped(r.description, 10, { gap: 2, color: [71, 85, 105] });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    ink(71, 85, 105);
    newPageIfNeeded(14);
    doc.text(
      `Gain estimé: ${r.estimatedGain}   ·   Temps: ${r.timeMinutes} min   ·   Risque: ${RISK_LABEL[r.risk]}`,
      M,
      y,
    );
    y += 18;
  }

  // System snapshot footer
  newPageIfNeeded(120);
  writeWrapped("Instantané système", 12, { bold: true, gap: 6, color: [15, 23, 42] });
  const lines = [
    `OS : ${snapshot.os.name} ${snapshot.os.version}`,
    `CPU : ${snapshot.cpu.usage.toFixed(1)}% · ${snapshot.cpu.cores} cœurs · ${snapshot.cpu.frequencyGhz} GHz · ${snapshot.cpu.temperature}°C`,
    `RAM : ${snapshot.ram.usedGb.toFixed(2)} / ${snapshot.ram.totalGb} Go`,
    `GPU : ${snapshot.gpu.usage}% · ${snapshot.gpu.vramUsedGb}/${snapshot.gpu.vramTotalGb} Go VRAM · ${snapshot.gpu.temperature}°C`,
    `Disque : ${snapshot.disk.usagePercent}% utilisé · R ${snapshot.disk.readMBs} / W ${snapshot.disk.writeMBs} MB/s · SMART ${snapshot.disk.healthPercent == null ? "Inconnu" : snapshot.disk.healthPercent + "%"}`,
    `Réseau : ↓ ${snapshot.network.downMbps} / ↑ ${snapshot.network.upMbps} Mb/s · ${snapshot.network.latencyMs} ms`,
    `Top processus : ${snapshot.processes
      .slice(0, 5)
      .map((p) => `${p.name} (${p.cpu.toFixed(0)}%)`)
      .join(", ")}`,
  ];
  for (const l of lines) writeWrapped(l, 9, { gap: 1, color: [71, 85, 105] });

  // Page numbers
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    ink(148, 163, 184);
    doc.text(`PC Diagnostic AI — page ${i} / ${total}`, W / 2, H - 20, { align: "center" });
  }

  return doc;
}

export function downloadDiagnosisPdf(opts: Options) {
  const doc = buildDiagnosisPdf(opts);
  const ts = new Date(opts.snapshot.takenAt).toISOString().slice(0, 19).replace(/[:T]/g, "-");
  doc.save(`pc-diagnostic-${ts}.pdf`);
}
