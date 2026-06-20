# AI PC Doctor

> Comprenez enfin pourquoi votre ordinateur ralentit — diagnostic IA en temps réel.

**Statut : Release Candidate** · Version `0.9.0-rc.1`

AI PC Doctor est une application desktop (Electron) qui analyse votre PC en temps réel, détecte automatiquement les causes de ralentissement grâce à l'intelligence artificielle, et génère des rapports PDF téléchargeables. Toutes les analyses sont effectuées **localement** — vos données système ne quittent jamais votre machine, sauf si vous choisissez explicitement de les synchroniser avec votre compte cloud.

---

## Aperçu

- **Analyse temps réel** : CPU, RAM, disques, réseau, températures, processus.
- **Diagnostic IA** : Un modèle Gemini 3 Flash identifie les goulots d'étranglement et propose des actions concrètes.
- **Alertes intelligentes** : Seuils configurables avec recommandations personnalisées.
- **Historique** : Conservation locale des diagnostics (migrable vers SQLite).
- **Rapports PDF** : Export professionnel des résultats.
- **Sécurité** : `contextIsolation`, CSP strict, sandbox — aucun accès arbitraire au système.

---

## Tech Stack

| Couche | Technologie |
|---|---|
| Frontend | React 19, TanStack Start v1, TanStack Router, Tailwind CSS v4 |
| Desktop | Electron 33, `systeminformation` v5 |
| Backend | TanStack Server Functions (Cloudflare Workers) |
| Auth | Supabase Auth (OAuth Google) |
| IA | Lovable AI Gateway — Gemini 3 Flash |
| PDF | jsPDF (génération côté client) |

---

## Démarrage rapide

### Prérequis

- [Node.js](https://nodejs.org/) ≥ 20 (ou [Bun](https://bun.sh/))
- Git

### Installation

```bash
git clone <repo-url>
cd <repo-folder>
bun install          # ou: npm install
```

### Développement web (mode démo)

```bash
npm run dev
```
Ouvre [http://localhost:8080](http://localhost:8080). En mode navigateur, les données sont simulées et le diagnostic IA est bloqué.

### Développement Electron (métriques réelles)

```bash
# Terminal A
npm run dev

# Terminal B
npm run electron:install   # une seule fois
npm run electron:dev       # fenêtre native avec vraies métriques
```

### Build

| Plateforme | Commande | Sortie |
|---|---|---|
| Web | `npm run build` | `dist/` |
| Windows | `npm run electron:package:win` | `electron-release/PC-Diagnostic-AI-win32-x64/` |
| macOS | `npm run electron:package:mac` | `electron-release/PC-Diagnostic-AI-darwin-x64/PC-Diagnostic-AI.app` |
| Linux | `npm run electron:package:linux` | `electron-release/PC-Diagnostic-AI-linux-x64/` |

> ⚠️ Windows et macOS nécessitent une **signature de binaire** (Authenticode / Notarization Apple) pour éviter les avertissements SmartScreen / Gatekeeper. Voir la section sécurité ci-dessous.

---

## Architecture

```
┌─────────────────┐     IPC      ┌──────────────────┐
│  Renderer React │ ◄───────────► │ Electron Main    │
│  (TanStack)     │  snapshot    │  + collector.cjs │
└────────┬────────┘              └──────────────────┘
         │
         │  serverFn (HTTPS)
         ▼
┌─────────────────┐
│  Cloud Worker   │  IA Gateway  →  Gemini 3 Flash
│  (TanStack)     │              →  Diagnostique structuré
└─────────────────┘
```

Les métriques système (CPU, RAM, disques, températures, processus) sont collectées **localement** par `systeminformation` dans le processus Electron principal. Elles transitent vers le renderer via un pont IPC sécurisé. Le diagnostic IA est déclenché via une `server function` distante, mais le serveur **rejette** tout snapshot qui ne provient pas d'Electron — il est impossible de lancer l'IA sur des données simulées.

---

## Sécurité

- **CSP strict** : `default-src 'self'` — pas d'inline script en production.
- **Context isolation** : Le renderer n'a aucun accès direct à Node.js.
- **IPC minimal** : Seules les métriques système et les actions autorisées (PDF, DB) traversent le pont.
- **Blocage IA en mode démo** : Bouton diagnostique désactivé dans le navigateur ; guard côté serveur.
- **Données personnelles** : Pas de télématrie, pas de traçage. Les snapshots restent sur la machine.

### Signature des binaires (Production Ready)

| Plateforme | Outil | Coût indicatif |
|---|---|---|
| Windows | `signtool` + certificat EV/OV | ~300 €/an |
| macOS | `codesign` + `notarytool` | ~99 €/an (Apple Developer) |
| Linux | `gpg --detach-sign` (optionnel) | Gratuit |

---

## Documentation

| Document | Public cible | Contenu |
|---|---|---|
| [`DEVELOPERS.md`](./DEVELOPERS.md) | Développeurs & IA | Architecture détaillée, flux de données, points sensibles, roadmap technique |
| [`HANDOFF.md`](./HANDOFF.md) | Reprise VS Code | Arborescence, dépendances, commandes, variables d'environnement, risques connus |
| [`electron/README.md`](./electron/README.md) | Desktop & Ops | Sécurité Electron, packaging, signature, limites sandbox |

---

## Roadmap

| Version | Focus |
|---|---|
| `1.0` | Signature binaire + SQLite natif + auto-update (Squirrel/Sparkle) |
| `1.1` | Tableau de bord multi-machines (cloud) + alertes push |
| `1.2` | Scénarios de réparation automatisés (nettoyage cache, désactivation services) |

---

## Licence

Propriétaire — tous droits réservés.

---

*Dernière mise à jour : Juin 2026 · Release Candidate*
