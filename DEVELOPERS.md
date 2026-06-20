# PC Diagnostic AI — Guide de reprise pour développeurs

> Release Candidate · Dernière mise à jour : juin 2026
>
> Ce document est le point d'entrée obligatoire pour tout développeur humain ou IA (Codex, Claude Code, Cursor, GPT) qui reprend ce projet. Chaque section est factuelle et vérifiable dans le code source.

---

## 1. Vision du produit

PC Diagnostic AI est une application de diagnostic de performances pour Windows, macOS et Linux. Elle collecte en temps réel les métriques système (CPU, RAM, GPU, disque, réseau, températures, processus) via un agent local (Electron + `systeminformation`), puis soumet un instantané à une IA (Gemini 3 Flash via Lovable AI Gateway) qui produit :

- un résumé explicatif en langage naturel (français),
- une liste de causes pondérées (~100 %),
- des recommandations chiffrées (gain estimé, temps, risque),
- les métriques déclenchantes (preuves chiffrées du diagnostic),
- un niveau de confiance avec justification.

Le résultat est présenté dans un dashboard médical/clinique (dark theme, navy + cyan) et peut être exporté en PDF. L'historique des diagnostics est stocké dans Supabase (cloud) avec RLS, et un cache local offline-first est maintenu via `localStorage`.

---

## 2. Architecture générale

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER / ELECTRON                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Landing    │  │   Auth      │  │  Dashboard  │  │  Historique │ │
│  │  (index)    │  │  (auth)     │  │   (app)     │  │  (history)  │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│         │                │                │                │        │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    TANSTACK START (React 19)                    │ │
│  │  · File-based routing (src/routes/)                           │ │
│  │  · TanStack Query (cache / loaders)                           │ │
│  │  · Server functions (createServerFn) → exécutés côté worker   │ │
│  │  · SSR via src/server.ts + src/start.ts                       │ │
│  └──────────────────────────────────────────────────────────────┘ │
│         │                    │                │                │        │
│  ┌──────┴──────┐  ┌─────────┴─────────┐  ┌──┴────────────┐  ┌──┴──────┐ │
│  │  useSnapshot │  │    useAutoDiagnose  │  │  history-store │  │  PDF   │ │
│  │  (2 s poll)  │  │  (alertes + sched)  │  │  (local/cloud) │  │ jsPDF │ │
│  └──────┬──────┘  └─────────────────────┘  └───────────────┘  └───────┘ │
│         │                                                           │
│  ┌──────┴──────┐     ┌─────────────────────────┐                   │
│  │ Electron IPC│────→│   systeminformation v5  │                   │
│  │ (preload)   │     │   (CPU/RAM/GPU/Disk/…)    │                   │
│  └─────────────┘     └─────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         SERVER / WORKER (Edge)                       │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  │  runDiagnosis   │───→│ Lovable AI Gateway│───→│  Supabase DB   │  │
│  │  (serverFn)     │    │ (Gemini 3 Flash)  │    │  (diagnoses)   │  │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘  │
│         ↑
│    Guard : snapshot.source === "electron" obligatoire
└─────────────────────────────────────────────────────────────────────┘
```

### Stack technique

| Couche | Technologie | Version |
|---|---|---|
| Framework | TanStack Start v1 | 1.167+ |
| Bundler | Vite | 8.0+ |
| React | React / React DOM | 19.2 |
| Styling | Tailwind CSS | 4.2 (native CSS @import) |
| UI | shadcn/ui + Radix UI | latest |
| Router | TanStack Router (file-based) | 1.168+ |
| State / Cache | TanStack Query | 5.83+ |
| Auth | Supabase Auth + Lovable Cloud | 2.108+ |
| Validation | Zod | 3.24+ |
| IA SDK | `ai` + `@ai-sdk/openai-compatible` | 6.0+ |
| PDF | jsPDF | 4.2+ |
| Desktop | Electron | 33+ |
| Métriques | systeminformation | 5+ |

---

## 3. Structure des dossiers

```
.
├── .env                          # Clés Supabase publishable (OK en clair)
├── package.json                  # Scripts + dépendances
├── vite.config.ts                # base:'./' (obligatoire pour Electron file://)
├── tsconfig.json
├── components.json               # Config shadcn/ui
├── src/
│   ├── styles.css                # Tailwind v4 + tokens design médical/clinique
│   ├── start.ts                  # Bootstrap TanStack Start + middlewares
│   ├── server.ts                 # Entry SSR (wrapper erreur)
│   ├── router.tsx                # Création router + QueryClient
│   ├── routeTree.gen.ts          # AUTO-GÉNÉRÉ — ne pas éditer
│   │
│   ├── routes/
│   │   ├── __root.tsx            # Shell HTML + Outlet + meta/SEO
│   │   ├── index.tsx             # Landing page (marketing)
│   │   ├── auth.tsx              # Login / signup (email + Google OAuth)
│   │   └── _authenticated/
│   │       ├── route.tsx         # Gate auth (redirect /auth si non connecté)
│   │       ├── app.tsx           # Dashboard principal (métriques + diagnostic IA)
│   │       └── history.tsx       # Historique cloud (graphique Recharts + liste)
│   │
│   ├── components/
│   │   ├── HealthScore.tsx       # Jauge 0-100
│   │   ├── MetricCard.tsx        # Cartes CPU/RAM/GPU/Disk/Net/Temp
│   │   ├── ProcessTable.tsx      # Table des 20 processus les plus gourmands
│   │   ├── DiagnosisCard.tsx     # Résultat IA (résumé, causes, reco, triggers)
│   │   ├── AlertBanner.tsx       # Alertes seuils avec compte à rebours
│   │   ├── SourceBadge.tsx       # Badge "Données réelles" vs "Mode démo"
│   │   └── ui/                   # Composants shadcn/ui (générés, 30+)
│   │
│   ├── hooks/
│   │   ├── use-snapshot.ts       # Polling métriques (Electron → réel, browser → mock)
│   │   ├── use-auto-diagnose.ts  # Détection alertes + auto-diagnostic 30 min
│   │   └── use-mobile.tsx        # Breakpoint mobile (shadcn)
│   │
│   ├── lib/
│   │   ├── metrics.ts            # Types SystemSnapshot + generateSnapshot (mock)
│   │   ├── electron-bridge.ts    # Interface IPC renderer → fetchRealSnapshot
│   │   ├── diagnose.functions.ts # ServerFn runDiagnosis + listDiagnoses
│   │   ├── ai-gateway.server.ts  # Factory provider Lovable AI Gateway
│   │   ├── alerts.ts             # Détection règles seuils (CPU>90, RAM>90, …)
│   │   ├── pdf-report.ts         # Génération + téléchargement PDF côté client
│   │   ├── history-store.ts      # Abstraction localStorage / SQLite / cloud
│   │   ├── config.server.ts      # Config serveur
│   │   ├── utils.ts              # cn() + helpers
│   │   └── error-*.ts            # Gestion erreurs Lovable / capture
│   │
│   └── integrations/
│       ├── lovable/index.ts      # Helpers auth Lovable Cloud
│       └── supabase/
│           ├── client.ts         # Browser client (AUTO — ne pas toucher)
│           ├── client.server.ts  # supabaseAdmin (service role)
│           ├── auth-attacher.ts    # Middleware global Authorization
│           ├── auth-middleware.ts# requireSupabaseAuth pour serverFns
│           └── types.ts            # Types DB auto-générés
│
├── electron/
│   ├── main.cjs                  # Process principal + CSP + hardening
│   ├── preload.cjs               # contextBridge → window.pcDiagnostic
│   ├── collector.cjs             # systeminformation → snapshot réel
│   └── README.md                 # Build / signature / packaging détaillé
│
├── supabase/
│   ├── config.toml               # Auto-généré
│   └── migrations/
│       ├── 2026…_auth_profiles   # Table profils + trigger
│       └── 2026…_diagnoses       # Table diagnoses (RLS, GRANT)
│
└── HANDOFF.md                    # Documentation technique de reprise (haut niveau)
```

---

## 4. Dépendances importantes

### Runtime — coeur applicatif
| Package | Rôle |
|---|---|
| `react` / `react-dom` 19 | UI |
| `@tanstack/react-start` / `react-router` / `router-plugin` | SSR + file-based routing |
| `@tanstack/react-query` | Cache & loaders |
| `@supabase/supabase-js` | Auth + DB + RLS |
| `@lovable.dev/cloud-auth-js` | Intégration Lovable Cloud |
| `zod` | Validation snapshots & inputs serverFn |
| `react-hook-form` + `@hookform/resolvers` | Formulaires auth |

### IA
| Package | Rôle |
|---|---|
| `ai` + `@ai-sdk/openai-compatible` | SDK appel Lovable AI Gateway |

### UI / Design
| Package | Rôle |
|---|---|
| `tailwindcss` v4 + `@tailwindcss/vite` + `tw-animate-css` | Styling (theme médical/clinique navy+cyan) |
| `@radix-ui/*` (x20+) | Primitives accessibles shadcn |
| `class-variance-authority` `clsx` `tailwind-merge` | Variantes CSS |
| `lucide-react` | Icônes |
| `sonner` | Toasts |
| `recharts` | Graphique historique (LineChart) |
| `embla-carousel-react` `vaul` `cmdk` `input-otp` `react-day-picker` `react-resizable-panels` | Widgets shadcn divers |
| `date-fns` | Formatage dates historique |

### PDF
| `jspdf` | Génération rapport PDF téléchargeable côté client |

### Desktop (installés via `npm run electron:install`, hors `dependencies`)
| `electron` ^33 | Wrapper desktop |
| `@electron/packager` ^18 | Build .exe / .app / linux |
| `systeminformation` ^5 | Métriques CPU/RAM/GPU/Disk/Net/Temp/Process |

### Dev
| `vite` 8 + `@vitejs/plugin-react` | Build/HMR |
| `typescript` 5.8 | Strict mode |
| `eslint` + `prettier` | Lint/format |
| `nitro` | Build runtime serverless (TanStack Start) |

---

## 5. Flux des données

### A. Collecte des métriques (toutes les 2 secondes)

```
useSnapshot(2000)
  ├── isElectron() ?
  │     ├── fetchRealSnapshot() ──→ window.pcDiagnostic.getSnapshot()
  │     │                               └── ipcRenderer.invoke("pcd:getSnapshot")
  │     │                                   └── electron/collector.cjs::collectSnapshot()
  │     │                                       └── systeminformation (CPU, RAM, GPU, Disk, Net, Temp, Procs)
  │     └── fallback mock si bridge absent ou échec
  └── generateSnapshot(0.65)  ← mode navigateur (demo)
```

Chaque snapshot contient :
- `source`: `"electron"` | `"mock"` — utilisé comme garde pour le diagnostic IA.
- `cpu`: usage %, temp °C, fréquence GHz, nombre de cœurs
- `ram`: total Go, utilisé Go
- `gpu`: usage %, temp °C, VRAM utilisé/total Go
- `disk`: usage %, read/write MB/s, `healthPercent` (SMART, peut être `null`)
- `network`: down/up Mb/s, latence ms
- `processes`: top 20 processus (pid, nom, cpu %, ram MB, impact)
- `os`: nom + version

### B. Détection d'alertes (locale, immédiate)

```
useAutoDiagnose()
  └── detectAlerts(snapshot)
        ├── CPU ≥ 90 %     → "cpu_saturation"
        ├── RAM ≥ 90 %     → "ram_pressure"
        ├── Disk ≥ 92 %    → "disk_saturation"
        ├── Temp ≥ 85 °C   → "thermal_throttling"
        ├── GPU ≥ 95 %     → "gpu_saturation"
        └── Latence ≥ 150 ms → "network_latency"
```

Si une alerte apparaît : compte à rebours de 10 secondes avant déclenchement automatique du diagnostic IA (annulable par l'utilisateur).

### C. Diagnostic IA (server function, protégée)

```
runDiagnosis({ snapshot })
  ├── GUARD : snapshot.source !== "electron" → ERREUR 500
  ├── validate snapshot via Zod (SnapshotSchema)
  ├── call Lovable AI Gateway (Gemini 3 Flash)
  │     └── structured output (Zod AnalysisSchema)
  │         ├── summary
  │         ├── causes[] (label, weightPercent, explanation)
  │         ├── recommendations[] (title, description, estimatedGain, risk, timeMinutes)
  │         ├── triggers[] (metric, value, threshold, severity) ← preuves chiffrées
  │         ├── confidence + confidenceReason
  │         └── severity
  ├── computeHealthScore(snapshot) (server-side mirror)
  ├── INSERT INTO diagnoses (user_id, snapshot, analysis, health_score, severity, summary)
  └── RETURN { id, analysis, healthScore, severity }
```

### D. Historique

```
listDiagnoses() ──→ SELECT FROM diagnoses WHERE user_id = auth.uid()
                      ORDER BY created_at DESC LIMIT 50
```

Affichage : sparkline Recharts (évolution du score), stats (min/max/avg), liste avec delta.

### E. Export PDF (côté client)

```
diagnosisCard.onDownload()
  └── downloadDiagnosisPdf({ analysis, snapshot, healthScore })
        └── jsPDF → pc-diagnostic-YYYY-MM-DD-HH-MM-SS.pdf
```

Contenu du PDF : en-tête, score + gravité + confiance, résumé, métriques déclenchantes, causes avec barres de progression, recommandations, instantané système, numéros de page.

---

## 6. Fonctionnement Electron

### Architecture sécurisée

Le processus principal (`electron/main.cjs`) applique un modèle de sécurité strict :

| Protection | État | Détail |
|---|---|---|
| `contextIsolation` | ✅ | Aucun accès direct à Node depuis le renderer |
| `nodeIntegration` | ❌ désactivé | Pas d'injection Node dans la page |
| `sandbox` | ✅ | Renderer dans un processus séparé |
| `webviewTag` | ❌ désactivé | Balise `<webview>` interdite |
| `will-attach-webview` | bloqué | Impossible de surcharger `webPreferences` |
| `will-navigate` | filtré | Navigation hors `file://` / dev URL bloquée |
| `setWindowOpenHandler` | https-only | Liens externes ouverts dans le navigateur système |
| Content-Security-Policy | strict | `default-src 'self'` + connect-src restreint |
| `X-Frame-Options` | DENY | Pas d'embed possible |
| `Referrer-Policy` | no-referrer | Aucun referer fuit |
| `setPermissionRequestHandler` | deny all | Caméra, micro, géoloc, notifs refusées |

Le CSP dev autorise `unsafe-eval` + `localhost:*` uniquement pour Vite HMR. Le CSP prod n'autorise ni `eval` ni inline-script.

### Collecte des métriques réelles

`electron/collector.cjs` utilise `systeminformation` v5. Chaque appel est protégé par `safe()` — si une métrique n'est pas disponible sur la machine cible, on retombe sur une valeur neutre (jamais inventée).

- **Santé disque (SMART)** : lue via `si.diskLayout().smartStatus`. Renvoie `null` (« Inconnu ») lorsque l'utilisateur n'est pas administrateur — l'UI affiche alors *SMART : Inconnu* au lieu d'une valeur factice.
- **Température CPU** : nécessite OpenHardwareMonitor / lm-sensors selon l'OS. Sinon `0`.
- **GPU** : dépend des pilotes et de l'OS. Sur Windows avec pilotes récents, `utilizationGpu` et `temperatureGpu` sont disponibles.

### IPC exposé (preload.cjs)

```javascript
window.pcDiagnostic = {
  isElectron: true,
  platform: process.platform,           // "win32" | "darwin" | "linux"
  ping: () => ipcRenderer.invoke("pcd:ping"),
  getSnapshot: () => ipcRenderer.invoke("pcd:getSnapshot"),
  getStaticInfo: () => ipcRenderer.invoke("pcd:getStaticInfo"),
};
```

Aucune autre API Node/Electron n'est exposée au renderer.

---

## 7. Fonctionnement du moteur IA

### Provider

```typescript
// src/lib/ai-gateway.server.ts
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createLovableAiGatewayProvider(lovableApiKey: string) {
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
}
```

### Modèle utilisé

`google/gemini-3-flash-preview` via la gateway Lovable.

### Prompt system

```
Tu es un médecin spécialisé dans les performances informatiques. Tu reçois un instantané système
(CPU, RAM, GPU, disque, réseau, processus) et tu dois :
1. Identifier en français, simple et accessible, POURQUOI l'ordinateur est lent MAINTENANT.
2. Lister les causes principales (avec un pourcentage de contribution qui somme à ~100).
3. Proposer des actions correctives concrètes, classées par gain.
Sois direct, sans jargon. Pas de listes à puces dans le résumé.
```

### Output structuré

L'appel utilise `experimental_output: Output.object({ schema: AnalysisSchema })` du SDK `ai`. Le LLM est contraint de renvoyer un JSON validé par Zod. Les champs critiques :

- `triggers` : liste des métriques qui ont déclenché le diagnostic (ex: `CPU: 94%`, seuil `> 90%`). C'est l'explication du "pourquoi".
- `confidence` + `confidenceReason` : niveau de confiance (low/medium/high/very_high) et justification.
- `causes` : tableau pondéré (somme ~100 %).
- `recommendations` : actions concrètes avec `estimatedGain`, `risk` (low/medium/high), `timeMinutes`.

### Garde anti-mock

Dans `runDiagnosis` (serverFn) :

```typescript
if (data.snapshot.source !== "electron") {
  throw new Error(
    "Diagnostic IA bloqué : données simulées. Installez l'application Desktop (Electron) pour analyser votre vrai PC.",
  );
}
```

Cette garde est **côté serveur** — impossible de bypasser en modifiant le frontend.

### Rate-limiting

Aucun rate-limit persistant n'est implémenté actuellement (mémoire process uniquement). En cas de recyclage du worker, le compteur est perdu. Migrer vers Postgres si trafic réel.

---

## 8. Fonctionnement de l'historique

### Double stockage

| Source | Implémentation | Usage |
|---|---|---|
| **Cloud** | Table `diagnoses` Supabase + RLS | Historique persistant, sync multi-appareils |
| **Local** | `localHistoryStore` (localStorage) | Cache offline-first, 200 entrées max |

### Interface commune

```typescript
// src/lib/history-store.ts
export interface HistoryStore {
  readonly kind: "local" | "cloud";
  list(limit?: number): Promise<DiagnosisRecord[]>;
  add(record: Omit<DiagnosisRecord, "id" | "created_at">): Promise<DiagnosisRecord>;
  clear(): Promise<void>;
  count(): Promise<number>;
}
```

La fonction `getHistoryStore()` est le point d'entrée unique. Aujourd'hui elle retourne toujours `localHistoryStore`. Pour ajouter SQLite natif côté Electron, implémenter `SqliteHistoryStore` et brancher dans `getHistoryStore()` quand `window.pcDiagnostic?.sqlite` est disponible.

### Cloud — table `diagnoses`

Migration Supabase : `supabase/migrations/2026..._diagnoses.sql`

```sql
CREATE TABLE public.diagnoses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  snapshot jsonb not null,
  analysis jsonb not null,
  health_score int not null,
  severity text not null,
  summary text not null,
  created_at timestamptz default now()
);
GRANT SELECT, INSERT ON public.diagnoses TO authenticated;
GRANT ALL ON public.diagnoses TO service_role;
ALTER TABLE public.diagnoses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only see their own diagnoses"
  ON public.diagnoses FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
```

---

## 9. Fonctionnement du PDF

Le PDF est généré **côté client** avec `jspdf` — aucun appel serveur requis.

### API

```typescript
import { downloadDiagnosisPdf } from "@/lib/pdf-report";

downloadDiagnosisPdf({
  analysis,      // Analysis (from runDiagnosis)
  snapshot,      // SystemSnapshot
  healthScore,   // number (0-100)
});
// → télécharge automatiquement pc-diagnostic-YYYY-MM-DD-HH-MM-SS.pdf
```

### Contenu du PDF

1. **En-tête** : titre "PC Diagnostic AI", sous-titre, date/heure du snapshot.
2. **Score + gravité + confiance** : jauge numérique /100, niveau de gravité, niveau de confiance, justification.
3. **Résumé exécutif** : texte en français généré par l'IA.
4. **Métriques déclenchantes** : badges avec métrique, valeur mesurée, seuil, sévérité.
5. **Causes principales** : liste avec barres de progression pondérées.
6. **Recommandations** : titre, description, gain estimé, temps requis, niveau de risque.
7. **Instantané système** : OS, CPU, RAM, GPU, disque (SMART), réseau, top 5 processus.
8. **Pagination** : numéros de page centrés en bas.

### Limitations

- Police : Helvetica (standard PDF), pas de police custom. Les caractères spéciaux français (accents) sont gérés par jsPDF natif.
- Pas de graphiques vectoriels (Recharts) dans le PDF — uniquement texte et formes basiques.

---

## 10. Commandes de développement

### Prérequis

- Node.js 20+ (LTS recommandé)
- `bun` ou `npm`
- Git

### Installation initiale

```bash
# 1. Cloner le repo
git clone <repo-url>
cd pc-diagnostic-ai

# 2. Installer les dépendances
bun install        # ou: npm install

# 3. Vérifier les variables d'environnement
# Le fichier .env est déjà au repo (clés publishable uniquement)
cat .env
```

### Développement web (preview navigateur)

```bash
npm run dev
# → http://localhost:8080
# Mode démo : métriques simulées, diagnostic IA bloqué
```

### Développement Electron (vraies métriques)

```bash
# Terminal A — serveur Vite
npm run dev

# Terminal B — Electron (nécessite les deps desktop installées)
npm run electron:install    # 1ʳᵉ fois uniquement
npm run electron:dev
# → Fenêtre native Electron avec vraies métriques + diagnostic IA activé
```

### Format & lint

```bash
npm run format    # Prettier sur tout le projet
npm run lint      # ESLint
```

---

## 11. Commandes de build

### Build web (publication Lovable Cloud)

```bash
npm run build
# Sortie : dist/ (static assets)
```

### Build Electron — Windows (.exe portable)

```bash
npm run electron:package:win
# Sortie : electron-release/PC-Diagnostic-AI-win32-x64/PC-Diagnostic-AI.exe
```

### Build Electron — macOS (.app)

```bash
npm run electron:package:mac
# Sortie : electron-release/PC-Diagnostic-AI-darwin-x64/PC-Diagnostic-AI.app
# Sur macOS uniquement — packager en .dmg :
npm install -g create-dmg
create-dmg electron-release/PC-Diagnostic-AI-darwin-x64/PC-Diagnostic-AI.app
```

### Build Electron — Linux (dossier exécutable)

```bash
npm run electron:package:linux
# Sortie : electron-release/PC-Diagnostic-AI-linux-x64/
# Puis créer un .AppImage :
appimagetool electron-release/PC-Diagnostic-AI-linux-x64/ PC-Diagnostic-AI.AppImage
```

### Notes de build

- `vite.config.ts` définit `base: './'` — obligatoire pour que Electron charge les assets via `file://`.
- `@electron/packager` est utilisé (pas `electron-builder` qui échoue dans ce sandbox à cause de binaires natifs).
- Cross-compilation : Windows depuis Linux nécessite `wine` pour `rcedit` (icônes/version), sinon les binaires sortent sans métadonnées.

---

## 12. Variables d'environnement

### Frontend (`.env` — publishable, OK en clair)

| Clé | Rôle |
|---|---|
| `VITE_SUPABASE_URL` | Endpoint REST/Auth Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clé anon (sûre côté client) |
| `VITE_SUPABASE_PROJECT_ID` | Ref projet Supabase |

### Serveur (serverFns / SSR — injectées par la plateforme)

| Clé | Rôle | Sensibilité |
|---|---|---|
| `SUPABASE_URL` | idem | Publique |
| `SUPABASE_PUBLISHABLE_KEY` | idem | Publique |
| `SUPABASE_PROJECT_ID` | idem | Publique |
| `SUPABASE_SERVICE_ROLE_KEY` | **Privée** — admin DB, bypass RLS | **NE JAMAIS embarquer dans le binaire Electron** |
| `LOVABLE_API_KEY` | Auth Lovable AI Gateway (Gemini) | **NE JAMAIS embarquer dans le binaire Electron** |

> **Règle critique** : Le binaire Electron ne doit jamais contenir `SUPABASE_SERVICE_ROLE_KEY` ni `LOVABLE_API_KEY`. Tout appel IA passe par la serverFn distante `runDiagnosis`. Le service role key est injectée par la plateforme hébergeur uniquement côté worker.

---

## 13. Points sensibles du projet

### 1. Garde anti-mock (critique)

Le diagnostic IA est bloqué côté serveur si `snapshot.source !== "electron"`. C'est la barrière principale contre les diagnostics trompeurs. Ne jamais supprimer ou affaiblir cette garde.

**Fichier** : `src/lib/diagnose.functions.ts:63-66`

### 2. Valeurs SMART nulles (santé disque)

`disk.healthPercent` est `number | null`. Sur Windows sans droits admin, la valeur est `null` et l'UI affiche "Inconnu". Ne jamais remplacer `null` par une valeur factice (ex: 100).

**Fichiers** : `src/lib/metrics.ts:22`, `electron/collector.cjs:27-34`, `src/routes/_authenticated/app.tsx:146-149`

### 3. CSP strict en Electron

Le CSP de production bloque `eval`, inline-script et toute connexion externe hors `*.lovable.dev`, `*.supabase.co`, `ai.gateway.lovable.dev`. Ajouter une nouvelle lib UI qui injecte du inline-style/script peut casser l'app Electron (page blanche).

**Fichier** : `electron/main.cjs:21-32`

### 4. Rate-limit en mémoire

`runDiagnosis` n'a pas de rate-limit persistant. En cas de spam, le compteur est perdu lors du recyclage du worker. À migrer en Postgres si le produit passe en GA.

### 5. localStorage limité (~5 Mo)

`localHistoryStore` stocke jusqu'à 200 diagnostics en localStorage. Au-delà, `try/catch` affiche un warning console mais ne bloque pas l'app. Prévoir SQLite natif côté Electron avant la GA.

**Fichier** : `src/lib/history-store.ts:47-52`

### 6. `systeminformation` et les droits

Plusieurs métriques nécessitent des droits élevés :
- `cpuTemperature` : 0 sans pilote (OpenHardwareMonitor / lm-sensors)
- `diskLayout().smartStatus` : `null` sans admin/root
- Temps de réponse : peut dépasser 2 secondes sur disques réseau/VM

**Fichier** : `electron/collector.cjs`

### 7. `routeTree.gen.ts` auto-généré

Ne jamais éditer manuellement. Il est régénéré par le plugin TanStack Router Vite à chaque build.

---

## 14. Fichiers à ne pas modifier sans précaution

| Fichier | Pourquoi | Action si modification nécessaire |
|---|---|---|
| `src/routeTree.gen.ts` | Auto-généré par TanStack Router | Ne pas toucher. Supprimer et rebuild si corrompu. |
| `src/integrations/supabase/client.ts` | Auto-généré (Lovable Cloud) | Ne pas toucher. Utiliser `@/integrations/supabase/client`. |
| `src/integrations/supabase/client.server.ts` | Auto-généré (service role) | Ne pas toucher. Charger dynamiquement dans `.server.ts` uniquement. |
| `src/integrations/supabase/types.ts` | Types DB auto-générés | Ne pas toucher. Régénérés par `supabase gen types`. |
| `src/integrations/supabase/auth-attacher.ts` | Middleware auth global | Ne pas toucher. Nécessaire pour `requireSupabaseAuth`. |
| `src/integrations/supabase/auth-middleware.ts` | Middleware `requireSupabaseAuth` | Ne pas toucher sans comprendre le flux JWT. |
| `supabase/config.toml` | Config projet Supabase | Ne pas toucher sans consultation backend. |
| `.env` | Clés publishable | OK pour ajouter des clés frontend. **Jamais** de secrets serveur ici. |
| `vite.config.ts` | `base: './'` requis pour Electron | Modifier avec prudence — `base: '/'` casse le build Electron. |

---

## 15. Roadmap future

### v1.0 — Production Ready (à venir)

- [ ] **Signature binaire** : Windows (Authenticode EV), macOS (notarization Apple Developer), Linux (GPG)
- [ ] **SQLite natif** : remplacer `localStorage` par `better-sqlite3` côté Electron (points de bascule identifiés dans `HANDOFF.md` §5)
- [ ] **Auto-update** : intégrer `electron-updater` (Squirrel.Windows / Sparkle / autoUpdater natif)
- [ ] **Tests E2E** : Playwright Electron pour valider les flux critiques
- [ ] **Rate-limit persistant** : table Postgres pour le rate-limit des diagnostics IA
- [ ] **Support multi-GPU** : améliorer la détection GPU sur multi-cartes
- [ ] **Notifications OS** : alertes natives quand un seuil critique est franchi

### v1.1 — Améliorations

- [ ] **Thème clair** : variante claire du thème médical
- [ ] **Export CSV/JSON** : export brut des métriques pour analyse externe
- [ ] **Planification avancée** : cron personnalisé (pas juste 30 min fixe)
- [ ] **Benchmarks** : comparaison de scores entre sessions

### v2.0 — Scale

- [ ] **Multi-machine** : dashboard admin pour surveiller plusieurs PCs (entreprise)
- [ ] **Agent headless** : version CLI de `electron/collector.cjs` pour serveurs
- [ ] **Intégrations** : webhooks Slack/Teams quand un diagnostic critique est détecté

---

## 16. Bugs connus

| # | Bug | Impact | Fichier concerné | Workaround |
|---|---|---|---|---|
| 1 | `cpuTemperature` renvoie 0 sans pilote | Alerte thermique muette | `electron/collector.cjs:83` | Détecter `temp===0` → afficher "capteur indisponible" |
| 2 | `diskLayout().smartStatus` requiert admin sur Windows | Health = `null` → UI "Inconnu" | `electron/collector.cjs:27-34` | Doc utilisateur : lancer en admin pour SMART complet |
| 3 | `systeminformation` lent sur disques réseau / VMs (>2 s par tick) | Polling 2 s saturé | `electron/collector.cjs` | Déjà géré : `useSnapshot` skip le tick si précédent non fini |
| 4 | Build Windows depuis Linux : pas d'icône `.ico` ni métadonnées | Binaire générique | `package.json:17` | Builder sur runner `windows-latest` CI |
| 5 | `node-gyp` requis pour `better-sqlite3` lors du switch SQLite | Build CI échoue sur Windows | futur `package.json` | Prévoir `windows-build-tools` dans la doc CI |
| 6 | Lovable AI Gateway peut throttle Gemini 3 Flash en pic | Diagnostic timeout | `src/lib/diagnose.functions.ts:78-89` | Ajouter retry + fallback modèle moins coûteux |
| 7 | `localStorage` plafonné ~5 Mo — 200 diagnostics complets peuvent saturer | Perte silencieuse | `src/lib/history-store.ts:47-52` | `try/catch` warn déjà en place. Migrer SQLite. |

---

## 17. Travaux restants avant Production Ready

### Bloquants (doit être fait avant GA)

1. **Signature des binaires**
   - Windows : certificat EV (~300 €/an) + `signtool`
   - macOS : Apple Developer (~99 €/an) + `codesign` + `xcrun notarytool` + `stapler`
   - Linux : GPG optionnel mais recommandé
   - **Emplacement** : hook post-build CI (GitHub Actions)

2. **Test manuel sur vraies machines**
   - Windows 10/11 ( physique + VM )
   - macOS Intel + Apple Silicon
   - Linux Ubuntu/Debian/Fedora
   - Valider que `systeminformation` retourne des valeurs cohérentes sur chaque plateforme

3. **Validation SMART réelle**
   - Sur Windows avec droits admin, vérifier que `smartStatus` renvoie `"Ok"` et que `healthPercent` est bien calculé.
   - Sur macOS/Linux, vérifier le comportement avec/without sudo.

4. **CSP et libs futures**
   - À chaque ajout de dépendance UI, vérifier dans la console Electron (devtools) qu'aucun blocage CSP n'apparaît.

### Importants (à faire rapidement après GA)

5. **SQLite natif côté Electron**
   - Implémenter `SqliteHistoryStore` dans `src/lib/history-store.ts`
   - Exposer `window.pcDiagnostic.sqlite` dans `electron/preload.cjs`
   - Ajouter handlers IPC `pcd:db:query` / `pcd:db:exec` dans `electron/main.cjs`
   - Ajouter `better-sqlite3` + `electron-rebuild` dans `package.json`

6. **Auto-update Electron**
   - Intégrer `electron-updater` (ou Squirrel.Windows + Sparkle)
   - Configurer un serveur de mise à jour (S3, GitHub Releases, etc.)

7. **Rate-limit persistant**
   - Migrer le rate-limit mémoire de `runDiagnosis` vers une table Postgres (`rate_limits`)

8. **Tests E2E**
   - Ajouter `playwright-electron` au pipeline CI
   - Couvrir : login, diagnostic IA (mock electron source), export PDF, historique

### Cosmétiques

9. **Thème clair** : ajouter une variante `:root.light` dans `src/styles.css`
10. **Internationalisation** : préparer i18n si marché non-francophone visé

---

## Checklist de reprise rapide (pour une IA ou un dev humain)

1. Lire ce fichier (`DEVELOPERS.md`) en entier.
2. Lire `HANDOFF.md` pour la documentation haut niveau.
3. Lire `electron/README.md` pour les détails sécurité/packaging.
4. Exécuter `npm run dev` et vérifier que la landing s'affiche.
5. Exécuter `npm run electron:install` puis `npm run electron:dev` et vérifier que le badge passe à "Données réelles".
6. Se connecter (auth email ou Google), naviguer vers `/app`.
7. Vérifier que le bouton "Pourquoi ça rame ?" est actif en mode Electron et désactivé en mode navigateur.
8. Lancer un diagnostic IA (nécessite Electron + connexion) et vérifier le résultat.
9. Tester le téléchargement PDF depuis la carte de diagnostic.
10. Naviguer vers `/history` et vérifier que le diagnostic apparaît.

---

*Ce document est maintenu à jour pour la Release Candidate. Toute modification architecturale majeure doit mettre à jour ce fichier.*
