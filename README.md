# AI PC Doctor

> Comprenez enfin pourquoi votre ordinateur ralentit — diagnostic IA en temps réel.

**Version du dépôt : `1.0.0`** · Le fonctionnement complet et la signature des installateurs restent à vérifier indépendamment.

AI PC Doctor est une application desktop (Electron) qui analyse votre PC en temps réel, détecte automatiquement les causes de ralentissement grâce à l'intelligence artificielle, et génère des rapports PDF téléchargeables. La collecte des métriques est effectuée **localement**. Lorsque vous lancez un diagnostic IA, un instantané système est transmis à une fonction serveur, puis au fournisseur IA configuré. Le diagnostic IA nécessite une connexion réseau et une authentification. La conservation locale de l'historique ne signifie pas que le diagnostic est exécuté hors ligne.

---

## Aperçu

- **Analyse temps réel** : CPU, RAM, disques, réseau, températures, processus.
- **Diagnostic IA** : Le fournisseur configuré analyse les métriques et propose des causes possibles et des actions à vérifier. OpenAI est prioritaire lorsqu'il est configuré ; Lovable AI est utilisé à défaut ou en repli.
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
| IA | OpenAI si configuré ; Lovable AI Gateway à défaut ou en repli |
| PDF | jsPDF (génération côté client) |

---

## Démarrage rapide

### Prérequis

- [Node.js](https://nodejs.org/) ≥ 20 (ou [Bun](https://bun.sh/))
- Git

### Installation

```bash
git clone https://github.com/johntordj241/ai-pc-doctor.git
cd ai-pc-doctor
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

Les métriques système (CPU, RAM, disques, températures, processus) sont collectées **localement** par `systeminformation` dans le processus Electron principal. Elles transitent vers le renderer via un pont IPC sécurisé. Le diagnostic IA est déclenché via une `server function` distante, avec une vérification du champ `source === "electron"`. Ce champ fourni par le client est un garde-fou applicatif ; il ne constitue pas une attestation cryptographique de la provenance des métriques.

---

## Sécurité

- **CSP strict** : `default-src 'self'` — pas d'inline script en production.
- **Context isolation** : Le renderer n'a aucun accès direct à Node.js.
- **IPC minimal** : Seules les métriques système et les actions autorisées (PDF, DB) traversent le pont.
- **Blocage IA en mode démo** : Bouton diagnostique désactivé dans le navigateur ; guard côté serveur.
- **Données système** : Les métriques sont collectées localement, mais le snapshot est transmis au serveur et au fournisseur IA lors d'un diagnostic. Évitez d'y inclure des informations confidentielles.

### Signature des binaires (à vérifier avant distribution)

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

*Présentation vérifiée dans le code le 17 octobre 2026. Aucun test fonctionnel complet ni audit de sécurité exhaustif n'est attesté par cette mise à jour.*
