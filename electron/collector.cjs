// Real system metrics collection via `systeminformation`.
// Windows is the priority target — most si.* calls work on macOS/Linux too.
// Every call is wrapped in safe() so a missing metric on a given OS falls
// back to a sensible default instead of crashing the whole snapshot.

const si = require("systeminformation");

async function safe(fn, fallback) {
  try {
    return await fn();
  } catch (err) {
    console.warn("[collector] metric unavailable:", err?.message ?? err);
    return fallback;
  }
}

function impactOf(cpu, ramMB) {
  const score = cpu * 1.2 + ramMB / 200;
  if (score > 45) return "critical";
  if (score > 25) return "high";
  if (score > 12) return "medium";
  return "low";
}

// Map a systeminformation SMART status string to a health percentage, or
// null when the value is not available (admin/root usually required).
function smartToHealth(status) {
  if (!status) return null;
  const s = String(status).toLowerCase();
  if (s === "ok") return 100;
  if (s.includes("predicted") || s.includes("fail")) return 25;
  if (s === "unknown" || s === "") return null;
  return null;
}

let _staticCache = null;
async function getStaticInfo() {
  if (_staticCache) return _staticCache;
  const [cpu, mem, os, graphics, disks] = await Promise.all([
    safe(() => si.cpu(), {}),
    safe(() => si.mem(), {}),
    safe(() => si.osInfo(), {}),
    safe(() => si.graphics(), { controllers: [] }),
    safe(() => si.diskLayout(), []),
  ]);
  _staticCache = {
    cpu: {
      manufacturer: cpu.manufacturer,
      brand: cpu.brand,
      cores: cpu.cores ?? 0,
      physicalCores: cpu.physicalCores ?? 0,
      speedGhz: cpu.speed ?? 0,
    },
    ram: { totalGb: mem.total ? +(mem.total / 1024 ** 3).toFixed(2) : 0 },
    os: { name: os.distro ?? os.platform ?? "Unknown", version: os.release ?? "" },
    gpus: (graphics.controllers ?? []).map((g) => ({
      model: g.model,
      vendor: g.vendor,
      vramMb: g.vram ?? 0,
    })),
    disks: (disks ?? []).map((d) => ({
      device: d.device,
      type: d.type,
      name: d.name,
      sizeGb: d.size ? +(d.size / 1024 ** 3).toFixed(0) : 0,
      smartStatus: d.smartStatus ?? null,
      healthPercent: smartToHealth(d.smartStatus),
    })),
  };
  return _staticCache;
}

async function collectSnapshot() {
  const stat = await getStaticInfo();

  const [load, mem, fsSize, fsStats, net, latency, temp, gpu, procs, cpuSpeedRes] =
    await Promise.all([
      safe(() => si.currentLoad(), { currentLoad: 0 }),
      safe(() => si.mem(), { total: 0, used: 0, active: 0 }),
      safe(() => si.fsSize(), []),
      safe(() => si.fsStats(), { rx_sec: 0, wx_sec: 0 }),
      safe(() => si.networkStats(), [{ rx_sec: 0, tx_sec: 0 }]),
      safe(() => si.inetLatency(), 0),
      safe(() => si.cpuTemperature(), { main: 0, max: 0 }),
      safe(() => si.graphics(), { controllers: [] }),
      safe(() => si.processes(), { list: [] }),
      safe(() => si.cpuCurrentSpeed(), { avg: stat.cpu.speedGhz }),
    ]);

  const cpuSpeed = cpuSpeedRes.avg ?? cpuSpeedRes.max ?? stat.cpu.speedGhz;

  // Primary disk = largest mount
  const primaryFs = (fsSize ?? []).slice().sort((a, b) => (b.size ?? 0) - (a.size ?? 0))[0] ?? {};
  const diskUsage = primaryFs.use ?? 0;
  const diskRead = fsStats?.rx_sec != null ? +(fsStats.rx_sec / 1024 / 1024).toFixed(1) : 0;
  const diskWrite = fsStats?.wx_sec != null ? +(fsStats.wx_sec / 1024 / 1024).toFixed(1) : 0;

  // Network — sum of active interfaces
  const netList = Array.isArray(net) ? net : [net].filter(Boolean);
  const downBps = netList.reduce((s, n) => s + (n?.rx_sec ?? 0), 0);
  const upBps = netList.reduce((s, n) => s + (n?.tx_sec ?? 0), 0);

  // GPU — first controller with utilization, else first available
  const ctrls = gpu.controllers ?? [];
  const gpuCtrl = ctrls.find((g) => g.utilizationGpu != null) ?? ctrls[0] ?? {};
  const gpuUsage = Math.round(gpuCtrl.utilizationGpu ?? 0);
  const gpuTemp = Math.round(gpuCtrl.temperatureGpu ?? 0);
  const vramTotalGb = gpuCtrl.vram ? +(gpuCtrl.vram / 1024).toFixed(1) : 0;
  const vramUsedMb = gpuCtrl.memoryUsed ?? 0;
  const vramUsedGb = vramUsedMb > 0 ? +(vramUsedMb / 1024).toFixed(1) : 0;

  // Top processes
  const totalRamMb = mem.total ? mem.total / (1024 * 1024) : 1;
  const processes = (procs.list ?? [])
    .map((p) => {
      const ramMB = p.memRss ? p.memRss / 1024 : ((p.mem ?? 0) * totalRamMb) / 100;
      const cpu = +(p.cpu ?? 0).toFixed(1);
      return {
        pid: p.pid,
        name: p.name || p.command || "unknown",
        cpu,
        ram: Math.round(ramMB),
        disk: 0,
        impact: impactOf(cpu, ramMB),
      };
    })
    .sort((a, b) => b.cpu + b.ram / 200 - (a.cpu + a.ram / 200))
    .slice(0, 20);

  return {
    takenAt: new Date().toISOString(),
    source: "electron",
    cpu: {
      usage: +(load.currentLoad ?? 0).toFixed(1),
      temperature: Math.round(temp.main ?? temp.max ?? 0),
      frequencyGhz: +(+cpuSpeed).toFixed(2),
      cores: stat.cpu.cores,
    },
    ram: {
      totalGb: stat.ram.totalGb,
      usedGb: mem.active
        ? +(mem.active / 1024 ** 3).toFixed(2)
        : mem.used
          ? +(mem.used / 1024 ** 3).toFixed(2)
          : 0,
    },
    gpu: { usage: gpuUsage, temperature: gpuTemp, vramUsedGb, vramTotalGb },
    disk: {
      usagePercent: Math.round(diskUsage),
      readMBs: diskRead,
      writeMBs: diskWrite,
      // Real SMART value if accessible; null = "Inconnu" (requires admin/root)
      healthPercent: stat.disks.find((d) => d.healthPercent != null)?.healthPercent ?? null,
    },
    network: {
      downMbps: +((downBps * 8) / 1_000_000).toFixed(1),
      upMbps: +((upBps * 8) / 1_000_000).toFixed(1),
      latencyMs: Math.round(latency ?? 0),
    },
    processes,
    os: stat.os,
  };
}

module.exports = { getStaticInfo, collectSnapshot };
