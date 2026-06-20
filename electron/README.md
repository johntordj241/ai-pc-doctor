# PC Diagnostic AI — Wrapper Desktop (Electron)

## Lancer en local

```bash
npm run electron:install      # une seule fois — installe electron + systeminformation
npm run dev                   # démarre Vite sur http://localhost:8080
npm run electron:dev          # ouvre la fenêtre Electron pointant sur le dev server
```

Pour un build de production local :

```bash
npm run electron:build        # vite build + electron sur dist/
```

## Sécurité — protections activées (`electron/main.cjs`)

| Protection | État | Détail |
|---|---|---|
| `contextIsolation` | ✅ | aucun accès direct à Node depuis le renderer |
| `nodeIntegration` | ❌ désactivé | aucune injection Node dans la page |
| `sandbox` | ✅ | renderer dans un process séparé |
| `webviewTag` | ❌ désactivé | balise `<webview>` interdite |
| `will-attach-webview` | bloqué | impossible de surcharger `webPreferences` |
| `will-navigate` | filtré | navigation hors `file://` / dev URL bloquée |
| `setWindowOpenHandler` | https-only | liens externes ouverts dans le navigateur système, http rejeté |
| Content-Security-Policy | strict | `default-src 'self'` + connect-src restreint à Lovable/Supabase/AI gateway |
| `X-Frame-Options` | DENY | pas d'embed possible |
| `Referrer-Policy` | no-referrer | aucun referer fuite vers l'extérieur |
| `setPermissionRequestHandler` | deny all | caméra, micro, géoloc, notifs refusées par défaut |

CSP dev autorise `unsafe-eval` + `localhost:*` uniquement pour Vite HMR. CSP prod n'autorise ni `eval` ni inline-script.

## Collecte des métriques

Toutes les valeurs réelles passent par `electron/collector.cjs` via `systeminformation` v5. Chaque appel est protégé par `safe()` — si une métrique n'est pas disponible sur la machine cible, on retombe sur une valeur neutre (jamais inventée).

- **Santé disque (SMART)** : lue via `si.diskLayout().smartStatus`. Renvoie `null` (« Inconnu ») lorsque l'utilisateur n'est pas administrateur — l'UI affiche alors *SMART : Inconnu* au lieu d'une valeur factice.
- **Température CPU** : nécessite OpenHardwareMonitor / lm-sensors selon l'OS. Sinon `0`.

## Blocage du diagnostic IA en mode démo

Le bouton « Pourquoi ça rame ? » est **désactivé** quand l'application tourne dans un navigateur ou quand le pont IPC n'est pas disponible. Le server function `runDiagnosis` refuse également toute requête dont `snapshot.source !== "electron"` — il est impossible de déclencher l'IA sur des données simulées, même en bypassant le bouton.

## Packaging

`@electron/packager` est utilisé (pas `electron-builder`, qui requiert des binaires natifs problématiques).

| Plateforme | Commande | Sortie | Signature requise |
|---|---|---|---|
| Windows | `npm run electron:package:win` | `electron-release/PC-Diagnostic-AI-win32-x64/` (contient `PC-Diagnostic-AI.exe`) | **Oui** (sinon SmartScreen affiche un avertissement) |
| macOS | `npm run electron:package:mac` | `electron-release/PC-Diagnostic-AI-darwin-x64/PC-Diagnostic-AI.app` | **Oui** (sinon Gatekeeper bloque l'app) |
| Linux | `npm run electron:package:linux` | `electron-release/PC-Diagnostic-AI-linux-x64/` | Non |

### Construire un `.dmg` (macOS uniquement)

`@electron/packager` produit un `.app`. Pour le packager en `.dmg`, il faut une machine macOS (l'outil `hdiutil` est exclusif à macOS) :

```bash
npm install -g create-dmg
create-dmg electron-release/PC-Diagnostic-AI-darwin-x64/PC-Diagnostic-AI.app
```

### Construire un `.AppImage` (Linux)

`@electron/packager` ne génère pas d'AppImage. Utiliser `appimagetool` après le build :

```bash
# Depuis electron-release/PC-Diagnostic-AI-linux-x64/
appimagetool . PC-Diagnostic-AI.AppImage
```

### Signature des binaires

**Windows (Authenticode)** — certificat EV ou OV (~300 €/an chez DigiCert, Sectigo, etc.) :

```powershell
signtool sign /fd SHA256 /a /tr http://timestamp.digicert.com /td SHA256 ^
  /f cert.pfx /p <password> PC-Diagnostic-AI.exe
```

**macOS (notarization)** — compte Apple Developer (~99 €/an) :

```bash
codesign --deep --force --options runtime --sign "Developer ID Application: ACME" \
  PC-Diagnostic-AI.app
xcrun notarytool submit PC-Diagnostic-AI.app.zip --apple-id you@acme.com --team-id XXXX --wait
xcrun stapler staple PC-Diagnostic-AI.app
```

**Linux** — pas de signature obligatoire ; signer l'AppImage via `gpg --detach-sign` reste recommandé pour l'intégrité.

## Limites connues du sandbox Lovable

- La signature Windows / macOS doit être faite **sur une vraie machine** avec accès au certificat.
- `.dmg` et `.AppImage` requièrent des outils non disponibles ici (`hdiutil`, `appimagetool`) — produire ces formats nécessite une CI dédiée (GitHub Actions runners `macos-latest` / `ubuntu-latest`).
- Aucun test E2E n'a été exécuté sur Windows réel depuis cet environnement.
