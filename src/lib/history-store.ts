// Abstraction couche d'historique des diagnostics.
//
// Deux implémentations sont fournies :
//   - LocalHistoryStore  : 100 % hors-ligne, basé sur localStorage. Utilisé en
//     priorité dans l'application Desktop pour garantir un fonctionnement
//     sans connexion. Compatible navigateur (testable en mode démo).
//   - CloudHistoryStore  : appelle les server functions Supabase (RLS, sync
//     multi-appareils). Sera branché plus tard pour la sync optionnelle.
//
// Pour passer à SQLite natif côté Electron, il suffit de fournir une
// implémentation `SqliteHistoryStore` qui respecte l'interface ci-dessous
// et l'enregistrer dans `getHistoryStore()` quand `window.pcDiagnostic` est
// disponible. L'API publique du store ne changera pas.

import type { Analysis } from "@/lib/diagnose.functions";
import type { SystemSnapshot } from "@/lib/metrics";

export interface DiagnosisRecord {
  id: string;
  created_at: string;
  summary: string;
  health_score: number;
  severity: Analysis["severity"];
  /** Stocké uniquement côté local — la version cloud ne renvoie que le résumé. */
  analysis?: Analysis;
  snapshot?: SystemSnapshot;
}

export interface HistoryStore {
  readonly kind: "local" | "cloud";
  list(limit?: number): Promise<DiagnosisRecord[]>;
  add(record: Omit<DiagnosisRecord, "id" | "created_at">): Promise<DiagnosisRecord>;
  clear(): Promise<void>;
  /** Nombre total d'éléments — utile pour les quotas freemium. */
  count(): Promise<number>;
}

// ---------------------------------------------------------------------------
// LocalHistoryStore — localStorage, hors-ligne, 200 entrées max.
// ---------------------------------------------------------------------------

const LS_KEY = "pcd:history:v1";
const MAX_LOCAL = 200;

function readAll(): DiagnosisRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(records: DiagnosisRecord[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(records.slice(0, MAX_LOCAL)));
  } catch (err) {
    console.warn("[history-store] quota localStorage atteint", err);
  }
}

export const localHistoryStore: HistoryStore = {
  kind: "local",
  async list(limit = 50) {
    return readAll().slice(0, limit);
  },
  async add(rec) {
    const full: DiagnosisRecord = {
      ...rec,
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Date.now()),
      created_at: new Date().toISOString(),
    };
    const all = [full, ...readAll()];
    writeAll(all);
    return full;
  },
  async clear() {
    writeAll([]);
  },
  async count() {
    return readAll().length;
  },
};

// ---------------------------------------------------------------------------
// Sélecteur — toujours `local` aujourd'hui. La sync cloud reste optionnelle
// et sera ajoutée lorsque l'utilisateur active explicitement la synchronisation.
// ---------------------------------------------------------------------------

export function getHistoryStore(): HistoryStore {
  return localHistoryStore;
}
