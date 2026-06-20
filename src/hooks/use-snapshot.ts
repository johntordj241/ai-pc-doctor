import { useEffect, useRef, useState } from "react";
import { generateSnapshot, type SystemSnapshot } from "@/lib/metrics";
import { fetchRealSnapshot, isElectron } from "@/lib/electron-bridge";

export type SnapshotSource = "electron" | "mock";

export interface UseSnapshotResult {
  snapshot: SystemSnapshot;
  source: SnapshotSource;
  error: string | null;
  loading: boolean;
}

/**
 * Polls system metrics every `intervalMs`.
 * - In Electron: real data via the preload IPC bridge.
 * - In a browser: simulated data (so the web preview stays useful).
 * - If the Electron call fails, falls back to mock and reports the error.
 */
export function useSnapshot(intervalMs = 2000): UseSnapshotResult {
  const electron = isElectron();
  const [snapshot, setSnapshot] = useState<SystemSnapshot>(() => generateSnapshot(0.65));
  const [source, setSource] = useState<SnapshotSource>(electron ? "electron" : "mock");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(electron);
  const inflight = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      if (cancelled || inflight.current) return;
      if (electron) {
        inflight.current = true;
        try {
          const real = await fetchRealSnapshot();
          if (cancelled) return;
          if (real) {
            setSnapshot(real);
            setSource("electron");
            setError(null);
          } else {
            // bridge present but call failed → degraded mode
            setSnapshot(generateSnapshot(0.65));
            setSource("mock");
            setError("Collecte système indisponible — affichage de données simulées.");
          }
        } catch (e: unknown) {
          if (!cancelled) {
            setSnapshot(generateSnapshot(0.65));
            setSource("mock");
            setError(e instanceof Error ? e.message : "Erreur de collecte");
          }
        } finally {
          inflight.current = false;
          if (!cancelled) setLoading(false);
        }
      } else {
        setSnapshot(generateSnapshot(0.65));
      }
    }

    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [electron, intervalMs]);

  return { snapshot, source, error, loading };
}
