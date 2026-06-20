// Mock system metrics generator.
// In the desktop (Electron) build, this module will be replaced by a real
// collector backed by `systeminformation` running in the main process.

export type ProcessInfo = {
  pid: number;
  name: string;
  cpu: number; // %
  ram: number; // MB
  disk: number; // MB/s
  impact: "low" | "medium" | "high" | "critical";
};

export type SystemSnapshot = {
  takenAt: string;
  /** "electron" = real metrics from systeminformation, "mock" = browser demo */
  source?: "electron" | "mock";
  cpu: { usage: number; temperature: number; frequencyGhz: number; cores: number };
  ram: { totalGb: number; usedGb: number };
  gpu: { usage: number; temperature: number; vramUsedGb: number; vramTotalGb: number };
  /** healthPercent = null when SMART n'est pas accessible (admin requis). */
  disk: { usagePercent: number; readMBs: number; writeMBs: number; healthPercent: number | null };
  network: { downMbps: number; upMbps: number; latencyMs: number };
  processes: ProcessInfo[];
  os: { name: string; version: string };
};

const COMMON_PROCESSES = [
  { name: "Chrome", baseCpu: 18, baseRam: 4200, weight: 1.6 },
  { name: "VS Code", baseCpu: 8, baseRam: 1800, weight: 1.1 },
  { name: "Slack", baseCpu: 4, baseRam: 900, weight: 0.6 },
  { name: "Spotify", baseCpu: 2, baseRam: 380, weight: 0.4 },
  { name: "OneDrive", baseCpu: 3, baseRam: 320, weight: 0.8 },
  { name: "Discord", baseCpu: 3, baseRam: 540, weight: 0.6 },
  { name: "Explorer", baseCpu: 1, baseRam: 180, weight: 0.3 },
  { name: "Node.js", baseCpu: 6, baseRam: 720, weight: 0.9 },
  { name: "Docker Desktop", baseCpu: 5, baseRam: 1400, weight: 1.2 },
  { name: "antivirus", baseCpu: 4, baseRam: 280, weight: 0.7 },
];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function impactOf(cpu: number, ram: number): ProcessInfo["impact"] {
  const score = cpu * 1.2 + ram / 200;
  if (score > 45) return "critical";
  if (score > 25) return "high";
  if (score > 12) return "medium";
  return "low";
}

export function generateSnapshot(stress = 0.7): SystemSnapshot {
  // stress 0..1 — higher means more load
  const cpuUsage = Math.min(99, 25 + stress * 65 + rand(-8, 8));
  const ramUsed = Math.min(15.5, 6 + stress * 8 + rand(-1, 1));
  const processes: ProcessInfo[] = COMMON_PROCESSES.map((p, i) => {
    const cpu = Math.max(0.1, p.baseCpu * (0.4 + stress * p.weight) + rand(-2, 4));
    const ram = Math.max(60, p.baseRam * (0.5 + stress * 0.9) + rand(-80, 160));
    return {
      pid: 1000 + i,
      name: p.name,
      cpu: Number(cpu.toFixed(1)),
      ram: Math.round(ram),
      disk: Number((rand(0, 8) * stress).toFixed(1)),
      impact: impactOf(cpu, ram),
    };
  }).sort((a, b) => b.cpu + b.ram / 200 - (a.cpu + a.ram / 200));

  return {
    takenAt: new Date().toISOString(),
    source: "mock",
    cpu: {
      usage: Number(cpuUsage.toFixed(1)),
      temperature: Math.round(55 + stress * 30 + rand(-4, 4)),
      frequencyGhz: Number((2.4 + stress * 1.8 + rand(-0.1, 0.2)).toFixed(2)),
      cores: 8,
    },
    ram: { totalGb: 16, usedGb: Number(ramUsed.toFixed(2)) },
    gpu: {
      usage: Math.round(15 + stress * 70 + rand(-10, 10)),
      temperature: Math.round(50 + stress * 28 + rand(-4, 4)),
      vramUsedGb: Number((1 + stress * 6 + rand(-0.5, 0.5)).toFixed(1)),
      vramTotalGb: 8,
    },
    disk: {
      usagePercent: Math.round(70 + stress * 25 + rand(-3, 3)),
      readMBs: Number((20 + stress * 180 + rand(-10, 20)).toFixed(0)),
      writeMBs: Number((10 + stress * 120 + rand(-5, 15)).toFixed(0)),
      healthPercent: null,
    },
    network: {
      downMbps: Number((stress * 60 + rand(0, 10)).toFixed(1)),
      upMbps: Number((stress * 12 + rand(0, 4)).toFixed(1)),
      latencyMs: Math.round(15 + stress * 80 + rand(-5, 10)),
    },
    processes,
    os: { name: "Windows", version: "11 Pro 23H2" },
  };
}

export function computeHealthScore(s: SystemSnapshot): number {
  const cpuScore = 100 - s.cpu.usage;
  const ramScore = 100 - (s.ram.usedGb / s.ram.totalGb) * 100;
  const diskScore = 100 - s.disk.usagePercent;
  const thermalScore = Math.max(0, 100 - Math.max(0, s.cpu.temperature - 60) * 3);
  const netScore = Math.max(0, 100 - Math.max(0, s.network.latencyMs - 30) * 1.2);
  return Math.round(
    cpuScore * 0.3 + ramScore * 0.25 + diskScore * 0.15 + thermalScore * 0.2 + netScore * 0.1,
  );
}

export function severityFromScore(
  score: number,
): "excellent" | "good" | "fair" | "degraded" | "critical" {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 55) return "fair";
  if (score >= 35) return "degraded";
  return "critical";
}
