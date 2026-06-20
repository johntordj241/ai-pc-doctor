// Renderer-side bridge to the Electron preload API.
// In a normal browser, `window.pcDiagnostic` is undefined → callers must
// fall back to the simulated metrics generator.

import type { SystemSnapshot } from "./metrics";

type IpcResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface PcDiagnosticBridge {
  isElectron: true;
  platform: NodeJS.Platform;
  ping: () => Promise<IpcResult<string>>;
  getSnapshot: () => Promise<IpcResult<SystemSnapshot>>;
  getStaticInfo: () => Promise<IpcResult<unknown>>;
}

declare global {
  interface Window {
    pcDiagnostic?: PcDiagnosticBridge;
  }
}

export function getBridge(): PcDiagnosticBridge | null {
  if (typeof window === "undefined") return null;
  return window.pcDiagnostic ?? null;
}

export function isElectron(): boolean {
  return !!getBridge();
}

export async function fetchRealSnapshot(): Promise<SystemSnapshot | null> {
  const bridge = getBridge();
  if (!bridge) return null;
  const res = await bridge.getSnapshot();
  if (!res.ok) {
    console.error("[electron-bridge] getSnapshot failed:", res.error);
    return null;
  }
  return res.data;
}
