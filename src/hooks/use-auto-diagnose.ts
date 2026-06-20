// Orchestrates:
//  - alert detection on every snapshot,
//  - countdown before the AI is invoked (cancellable),
//  - scheduled background diagnosis (default 30 min).
//
// The diagnosis call itself is owned by the page; this hook only signals
// when it should fire and exposes the current alerts + countdown.

import { useCallback, useEffect, useRef, useState } from "react";
import type { SystemSnapshot } from "@/lib/metrics";
import { alertSignature, detectAlerts, type Alert } from "@/lib/alerts";

interface Options {
  snapshot: SystemSnapshot;
  /** Called when the AI diagnosis should run. Must be idempotent on re-entry. */
  onDiagnose: (reason: "alert" | "scheduled" | "manual") => Promise<void> | void;
  /** Seconds between the moment alerts appear and the auto-diagnosis. */
  alertCountdownSec?: number;
  /** Period of the scheduled background diagnosis in milliseconds. */
  scheduledIntervalMs?: number;
  /** Enable scheduled background diagnosis. Persisted by the caller. */
  scheduleEnabled?: boolean;
}

export function useAutoDiagnose({
  snapshot,
  onDiagnose,
  alertCountdownSec = 10,
  scheduledIntervalMs = 30 * 60 * 1000,
  scheduleEnabled = false,
}: Options) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [dismissedSig, setDismissedSig] = useState<string>("");
  const lastSigRef = useRef<string>("");
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastScheduledRef = useRef<number>(Date.now());
  const runningRef = useRef(false);

  const stopCountdown = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = null;
    setSecondsLeft(null);
  }, []);

  const runNow = useCallback(
    async (reason: "alert" | "scheduled" | "manual") => {
      if (runningRef.current) return;
      runningRef.current = true;
      stopCountdown();
      try {
        await onDiagnose(reason);
        lastScheduledRef.current = Date.now();
      } finally {
        runningRef.current = false;
      }
    },
    [onDiagnose, stopCountdown],
  );

  const dismiss = useCallback(() => {
    stopCountdown();
    setDismissedSig(lastSigRef.current);
  }, [stopCountdown]);

  // Detect alerts each time the snapshot changes
  useEffect(() => {
    const next = detectAlerts(snapshot);
    setAlerts(next);
    const sig = alertSignature(next);
    lastSigRef.current = sig;

    // New alert set → start countdown (unless dismissed by user)
    if (sig && sig !== dismissedSig && countdownRef.current === null && !runningRef.current) {
      setSecondsLeft(alertCountdownSec);
      countdownRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s === null) return null;
          if (s <= 1) {
            stopCountdown();
            void runNow("alert");
            return null;
          }
          return s - 1;
        });
      }, 1000);
    }

    // Alerts cleared → cancel countdown and reset dismissal
    if (!sig) {
      stopCountdown();
      setDismissedSig("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot]);

  // Scheduled background diagnosis
  useEffect(() => {
    if (!scheduleEnabled) return;
    const id = setInterval(() => {
      if (Date.now() - lastScheduledRef.current >= scheduledIntervalMs) {
        void runNow("scheduled");
      }
    }, 30_000); // check every 30s
    return () => clearInterval(id);
  }, [scheduleEnabled, scheduledIntervalMs, runNow]);

  return {
    alerts,
    secondsLeft,
    diagnoseNow: () => runNow("manual"),
    dismiss,
  };
}
