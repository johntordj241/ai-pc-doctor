# PC Diagnostic AI — Documentation technique de reprise

Release Candidate · cible : reprise dans VS Code, build local Windows/macOS/Linux.

---

## 1. Arborescence du projet

```
.
├── .env                         # Variables Supabase (publishable, OK en clair)
├── .gitignore .prettierrc .prettierignore eslint.config.js
├── components.json              # Config shadcn/ui
├── package.json                 # Scripts npm + dépendances
├── bun.lock / package-lock.json
├── tsconfig.json
├── vite.config.ts               # base:'./' (requis pour Electron file://)
├── bunfig.toml
│
├── electron/                    # Wrapper desktop
│   ├── main.cjs                 # Process principal + IPC + CSP + hardening
│   ├── preload.cjs              # contextBridge -> window.pcDiagnostic
│   ├── collector.cjs            # systeminformation -> snapshot réel
│   └── README.md                # Build / signature / packaging
│
├── supabase/
│   ├── config.toml
│   └── migrations/
│       ├── 2026...auth + profils
│       └── 2026...diagnoses (table historique cloud, RLS)
│
└── src/
    ├── styles.css               # Tailwind v4 + design tokens médicaux
    ├── start.ts                 # Bootstrap TanStack Start + middlewares
    ├── server.ts                # Entry SSR
    ├── router.tsx               # Création router + QueryClient
    ├── routeTree.gen.ts         # AUTO-GÉNÉRÉ — ne pas éditer
    │
    ├── routes/
    │   ├── __root.tsx           # Shell HTML + Outlet
    │   ├── index.tsx            # Landing
    │   ├── auth.tsx             # Login / signup
    │   └── _authenticated/
    │       ├── route.tsx        # Gate auth (redirect /auth)
    │       ├── app.tsx          # Dashboard principal (métriques live)
    │       └── history.tsx      # Historique des diagnostics
    │
    ├── components/
    │   ├── HealthScore.tsx      # Jauge 0-100
    │   ├── MetricCard.tsx       # CPU/RAM/GPU/Disk/Net cards
    │   ├── ProcessTable.tsx     # Top processus
    │   ├── DiagnosisCard.tsx    # Résultat IA + bouton PDF
    │   ├── AlertBanner.tsx      # Alertes seuils (CPU>90, etc.)
    │   ├── SourceBadge.tsx      # "Données réelles" vs "Mode démo"
    │   └── ui/                  # shadcn/ui (générés)
    │
    ├── hooks/
    │   ├── use-snapshot.ts      # Polling métriques (Electron ou mock)
    │   ├── use-auto-diagnose.ts # Analyse planifiée 30 min
    │   └── use-mobile.tsx
    │
    ├── lib/
    │   ├── metrics.ts           # Types SystemSnapshot + generateSnapshot (mock)
    │   ├── electron-bridge.ts   # fetchRealSnapshot via window.pcDiagnostic
    │   ├── diagnose.functions.ts# serverFn runDiagnosis (guard source=electron)
    │   ├── ai-gateway.server.ts # Appel Lovable AI Gateway (Gemini 3 Flash)
    │   ├── alerts.ts            # Détection seuils + recommandations
    │   ├── pdf-report.ts        # Génération PDF (jspdf)
    │   ├── history-store.ts     # Abstraction localStorage / SQLite / cloud
    │   ├── config.server.ts
    │   ├── error-capture.ts / error-page.ts / lovable-error-reporting.ts
    │   └── utils.ts
    │
    └── integrations/
        ├── lovable/index.ts
        └── supabase/
            ├── client.ts           # Browser publishable (AUTO — ne pas toucher)
            ├── client.server.ts    # supabaseAdmin (service role)
            ├── auth-attacher.ts    # Middleware global Authorization
            ├── auth-middleware.ts  # requireSupabaseAuth pour serverFns
            └── types.ts            # AUTO (DB types)
```

---

## 2. Dépendances & rôles

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
| `tailwindcss` v4 + `@tailwindcss/vite` + `tw-animate-css` | Styling (medical/clinique) |
| `@radix-ui/*` | Primitives accessibles shadcn |
| `class-variance-authority` `clsx` `tailwind-merge` | Variantes CSS |
| `lucide-react` | Icônes |
| `sonner` | Toasts |
| `recharts` | Graphiques historique |
| `embla-carousel-react` `vaul` `cmdk` `input-otp` `react-day-picker` `react-resizable-panels` | Widgets shadcn |
| `date-fns` | Formatage dates historique |

### PDF
| `jspdf` | Génération rapport diagnostic téléchargeable côté client |

### Desktop (installés via `npm run electron:install`, hors `dependencies`)
| `electron` ^33 | Wrapper desktop |
| `@electron/packager` ^18 | Build .exe / .app / linux |
| `systeminformation` ^5 | Métriques CPU/RAM/GPU/Disk/Net/Temp/Process |

### Dev
| `vite` 8 + `@vitejs/plugin-react` | Build/HMR |
| `typescript` 5.8 | Strict mode |
| `eslint` + `prettier` (+ plugins) | Lint/format |
| `nitro` | Build runtime serverless (TanStack Start) |

---

## 3. Commandes

### Développement local (web preview)
```bash
bun install                       # ou: npm install
npm run dev                       # http://localhost:8080
```

### Développement Electron (vraies métriques)
```bash
npm run electron:install          # 1ʳᵉ fois — installe electron + systeminformation
# Terminal A
npm run dev
# Terminal B
npm run electron:dev              # ouvre la fenêtre native
```

### Build web (publication Lovable Cloud)
```bash
npm run build
```

### Build Windows (.exe portable)
```bash
npm run electron:package:win
# Sortie : electron-release/PC-Diagnostic-AI-win32-x64/PC-Diagnostic-AI.exe
```

### Build macOS (.app — puis .dmg via create-dmg sur Mac)
```bash
npm run electron:package:mac
# Sortie : electron-release/PC-Diagnostic-AI-darwin-x64/PC-Diagnostic-AI.app
# Sur macOS uniquement :
npm install -g create-dmg
create-dmg electron-release/PC-Diagnostic-AI-darwin-x64/PC-Diagnostic-AI.app
```

### Build Linux (dossier exécutable — puis AppImage)
```bash
npm run electron:package:linux
# Sortie : electron-release/PC-Diagnostic-AI-linux-x64/
appimagetool electron-release/PC-Diagnostic-AI-linux-x64/ PC-Diagnostic-AI.AppImage
```

> Cross-compilation : `electron-packager` permet de construire les 3 plateformes depuis Linux/macOS. Windows requiert `wine` pour rcedit (icônes/version), sinon les binaires sortent sans métadonnées.

---

## 4. Variables d'environnement

### Frontend (`.env` à la racine — incluses au repo car publishable)
| Clé | Rôle |
|---|---|
| `VITE_SUPABASE_URL` | Endpoint REST/Auth |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clé anon (sûre côté client) |
| `VITE_SUPABASE_PROJECT_ID` | Ref projet |

### Serveur (serverFns / SSR — injectées par l'hébergeur)
| Clé | Rôle |
|---|---|
| `SUPABASE_URL` | idem |
| `SUPABASE_PUBLISHABLE_KEY` | idem |
| `SUPABASE_PROJECT_ID` | idem |
| `SUPABASE_SERVICE_ROLE_KEY` | **Privée** — uniquement côté worker. Non distribuée avec le binaire Electron. |
| `LOVABLE_API_KEY` | Auth Lovable AI Gateway (Gemini). Injectée par la plateforme. |

> ⚠️ Le binaire Electron **ne doit jamais** embarquer `SUPABASE_SERVICE_ROLE_KEY` ni `LOVABLE_API_KEY`. Tout appel IA passe par le serverFn distant `runDiagnosis`.

---

## 5. SQLite à venir — points de bascule

L'historique tourne aujourd'hui sur `localStorage` via `LocalHistoryStore`. Pour passer à SQLite natif (better-sqlite3) côté Electron :

| Fichier | Action |
|---|---|
| `src/lib/history-store.ts` | Ajouter `SqliteHistoryStore` implémentant `HistoryStore`. La fonction `getHistoryStore()` renvoie déjà via switch — brancher : `if (window.pcDiagnostic?.sqlite) return sqliteHistoryStore`. |
| `electron/preload.cjs` | Exposer `window.pcDiagnostic.sqlite = { query, exec }` via `contextBridge`. |
| `electron/main.cjs` | Nouveaux handlers IPC `pcd:db:query` / `pcd:db:exec` autour de `better-sqlite3`. |
| `electron/collector.cjs` | Inchangé. |
| `package.json` (electron:install) | Ajouter `better-sqlite3` (nécessite `electron-rebuild` après install). |

Aucun changement d'API publique — les composants (`history.tsx`, `app.tsx`) consomment uniquement `getHistoryStore()`.

---

## 6. Signature des binaires — emplacements

Toute signature se fait **après** packaging, sur la machine cible (hors sandbox Lovable). Les emplacements à modifier :

| Plateforme | Commande à insérer | Où |
|---|---|---|
| **Windows** | `signtool sign /fd SHA256 /a /tr http://timestamp.digicert.com /td SHA256 /f cert.pfx /p <pwd> PC-Diagnostic-AI.exe` | Hook post-build CI (GitHub Actions `windows-latest`) sur `electron-release/PC-Diagnostic-AI-win32-x64/PC-Diagnostic-AI.exe` |
| **macOS (codesign)** | `codesign --deep --force --options runtime --sign "Developer ID Application: …" PC-Diagnostic-AI.app` | Hook post-build sur `electron-release/PC-Diagnostic-AI-darwin-x64/PC-Diagnostic-AI.app` |
| **macOS (notarize)** | `xcrun notarytool submit … --wait` + `xcrun stapler staple …` | Après codesign |
| **Linux (optionnel)** | `gpg --detach-sign PC-Diagnostic-AI.AppImage` | Après `appimagetool` |

Le `package.json` n'a **pas** de hook `afterSign` car on n'utilise pas `electron-builder`. Ajouter ces étapes dans le workflow CI (`.github/workflows/release.yml`).

Secrets nécessaires côté CI :
- `WIN_CERT_BASE64`, `WIN_CERT_PASSWORD`
- `APPLE_ID`, `APPLE_TEAM_ID`, `APPLE_APP_PASSWORD`, `APPLE_DEV_ID_CERT_BASE64`

---

## 7. Risques techniques connus (à valider en test réel)

| # | Risque | Impact | Mitigation |
|---|---|---|---|
| 1 | `cpuTemperature` renvoie 0 sans pilote (Win sans OpenHardwareMonitor, Linux sans `lm-sensors`) | Alerte thermique muette | Détecter `temp===0` → afficher « capteur indisponible » au lieu d'inférer |
| 2 | `diskLayout().smartStatus` requiert admin sur Windows | Health = `null` → UI "Inconnu" | Doc utilisateur : lancer en admin pour SMART complet |
| 3 | `systeminformation` lent sur disques réseau / VMs (>2 s par tick) | Polling 2 s saturé | Fallback : si tick précédent pas fini, skip (déjà géré par `useSnapshot`) |
| 4 | SmartScreen Windows si binaire non signé | L'utilisateur voit "Éditeur inconnu" | Signature EV obligatoire avant GA |
| 5 | Gatekeeper macOS bloque les `.app` non notarisées | App refuse de s'ouvrir | Notarization Apple Developer (~99 €/an) |
| 6 | CSP stricte peut casser des libs futures qui injectent inline-style/script | Page blanche silencieuse | Vérifier la console Electron à chaque ajout de lib UI |
| 7 | `runDiagnosis` est rate-limité en mémoire process — perd l'état si serveur recyclé | Spam IA possible après cold-start | Migrer le rate-limit en Postgres si trafic réel |
| 8 | `localStorage` plafonné ~5 Mo — 200 diagnostics complets peuvent saturer | Perte silencieuse (try/catch warn) | Migrer SQLite (voir §5) avant la GA |
| 9 | Snapshot mock encore présent (mode démo navigateur) — IA correctement bloquée mais l'UI peut afficher des valeurs aléatoires | Mauvaise UX si l'utilisateur ne voit pas le badge | `SourceBadge` est toujours rendu — vérifier au QA |
| 10 | Aucune mise à jour automatique (pas d'`electron-updater`) | Utilisateurs bloqués sur v1 | Prévoir Squirrel.Windows / Sparkle / autoUpdater natif en v1.1 |
| 11 | Build Windows depuis Linux : pas d'icône `.ico` ni de métadonnées | Binaire générique | Builder sur runner `windows-latest` avec `--icon=electron/icon.ico` |
| 12 | `node-gyp` requis pour `better-sqlite3` lors du switch SQLite | Build CI échoue sur Windows sans build tools | Documenter `npm install --global windows-build-tools` |
| 13 | Lovable AI Gateway peut throttle Gemini 3 Flash en pic | Diagnostic timeout | Ajouter retry + fallback modèle moins coûteux |
| 14 | Aucun test E2E (Playwright Electron) exécuté | Régressions silencieuses | Ajouter `playwright-electron` au pipeline |

---

## 8. Reprendre sous VS Code — checklist

1. `git clone <repo>` puis ouvrir le dossier dans VS Code.
2. Extensions recommandées : ESLint, Prettier, Tailwind CSS IntelliSense, TypeScript Nightly.
3. `bun install` (ou `npm install`).
4. Copier `.env` (déjà au repo — clés publishable).
5. Demander à Lovable / admin les secrets serveur (`SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`) et les ajouter via le panneau Secrets de l'hébergeur — **pas** dans `.env`.
6. `npm run dev` → http://localhost:8080 (mode démo, IA bloquée).
7. `npm run electron:install` puis `npm run electron:dev` pour valider les vraies métriques.
8. Pour publier : `npm run electron:package:<plateforme>` puis signer (cf §6).

---

## 9. Conventions à respecter

- **Ne pas éditer** : `src/routeTree.gen.ts`, `src/integrations/supabase/{client,client.server,types,auth-*}.ts`, `supabase/config.toml`, `.env` (clés publishable uniquement).
- Routes : convention `src/routes/_authenticated/<page>.tsx` pour les pages protégées.
- ServerFns app-internes : `createServerFn` (`src/lib/*.functions.ts`). Webhooks publics : `src/routes/api/public/*`.
- Tokens design : `src/styles.css` (palette médicale). **Aucune** couleur hardcodée dans les composants.
- Historique : passer toujours par `getHistoryStore()` — jamais `localStorage.getItem` direct.

---

Documentation à jour pour la Release Candidate. Tout ajout fonctionnel devra mettre à jour ce fichier.
