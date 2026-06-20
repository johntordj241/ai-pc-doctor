// Electron main process — PC Diagnostic AI
// Loads the built web app (dist/) and exposes a secure IPC bridge that
// returns real system metrics via `systeminformation`.
//
// Hardening summary (see electron/README.md > "Security"):
//  - contextIsolation: true, nodeIntegration: false, sandbox: true
//  - strict Content-Security-Policy injected on every response
//  - navigation blocked outside the bundled app
//  - window.open / target=_blank only allowed for https: URLs (opened externally)
//  - <webview> tag disabled
//  - permission requests denied by default

const { app, BrowserWindow, ipcMain, shell, session } = require("electron");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { URL } = require("node:url");
const { collectSnapshot, getStaticInfo } = require("./collector.cjs");

const isDev = !!process.env.ELECTRON_DEV_URL;
let productionServer;

// CSP — strict in prod. Dev needs 'unsafe-eval' for Vite HMR.
const CSP_PROD = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.lovable.dev https://*.supabase.co https://ai.gateway.lovable.dev",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join("; ");

const CSP_DEV = [
  "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:*",
  "connect-src 'self' http://localhost:* ws://localhost:* https://*.lovable.dev https://*.supabase.co https://ai.gateway.lovable.dev",
  "img-src 'self' data: blob: http://localhost:*",
].join("; ");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[match[1]]) process.env[match[1]] = value;
  }
}

function loadRuntimeEnv() {
  if (isDev) {
    loadEnvFile(path.join(__dirname, "..", ".env"));
  }

  process.env.SUPABASE_URL ||= process.env.VITE_SUPABASE_URL;
  process.env.SUPABASE_PUBLISHABLE_KEY ||= process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!globalThis.WebSocket) {
    globalThis.WebSocket = require("ws");
  }
}

function getProductionPaths(appPath) {
  const asarPath = path.join(process.resourcesPath, "app.asar");
  const unpackedPath = path.join(process.resourcesPath, "app.asar.unpacked");

  // Installed app can report appPath as app.asar.unpacked. In that case,
  // server ESM files must be loaded from app.asar so Node gets the right
  // package scope (type: module) and does not parse them as CommonJS.
  if (fs.existsSync(asarPath)) {
    const asarDistRoot = path.join(asarPath, "dist");
    const unpackedDistRoot = path.join(unpackedPath, "dist");
    return {
      serverEntry: path.join(asarDistRoot, "server", "server.js"),
      // Keep SSR HTML + client bundles from the same package source first
      // to avoid hydration mismatch when unpacked assets lag behind.
      clientRoots: [path.join(asarDistRoot, "client"), path.join(unpackedDistRoot, "client")],
    };
  }

  if (!appPath.endsWith(".asar")) {
    const distRoot = path.join(appPath, "dist");
    return {
      serverEntry: path.join(distRoot, "server", "server.js"),
      clientRoots: [path.join(distRoot, "client")],
    };
  }

  const asarDistRoot = path.join(appPath, "dist");
  const unpackedDistRoot = path.join(process.resourcesPath, "app.asar.unpacked", "dist");
  return {
    serverEntry: path.join(asarDistRoot, "server", "server.js"),
    // Keep SSR HTML + client bundles from the same package source first
    // to avoid hydration mismatch when unpacked assets lag behind.
    clientRoots: [path.join(asarDistRoot, "client"), path.join(unpackedDistRoot, "client")],
  };
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return (
    {
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".mjs": "text/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon",
      ".woff": "font/woff",
      ".woff2": "font/woff2",
    }[ext] ?? "application/octet-stream"
  );
}

async function tryServeClientAsset(req, res, clientRoot) {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  const url = new URL(req.url, "http://127.0.0.1");
  if (!url.pathname.startsWith("/assets/")) return false;

  const relativePath = decodeURIComponent(url.pathname.slice(1)).replace(/\//g, path.sep);
  const filePath = path.resolve(clientRoot, relativePath);
  const clientRootResolved = path.resolve(clientRoot);
  if (!filePath.startsWith(clientRootResolved + path.sep)) {
    res.writeHead(403);
    res.end();
    return true;
  }

  try {
    const stat = await fs.promises.stat(filePath);
    if (!stat.isFile()) return false;
    res.writeHead(200, {
      "content-type": getContentType(filePath),
      "content-length": stat.size,
      "cache-control": "public, max-age=31536000, immutable",
    });
    if (req.method === "HEAD") res.end();
    else fs.createReadStream(filePath).pipe(res);
    return true;
  } catch {
    return false;
  }
}

async function tryServeClientAssets(req, res, clientRoots) {
  for (const clientRoot of clientRoots) {
    if (await tryServeClientAsset(req, res, clientRoot)) return true;
  }
  return false;
}

async function tryServeClientIndex(req, res, clientRoots) {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  for (const clientRoot of clientRoots) {
    const indexPath = path.join(clientRoot, "index.html");
    try {
      const stat = await fs.promises.stat(indexPath);
      if (!stat.isFile()) continue;
      res.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "content-length": stat.size,
        "cache-control": "no-store",
      });
      if (req.method === "HEAD") res.end();
      else fs.createReadStream(indexPath).pipe(res);
      return true;
    } catch {
      // Try next root.
    }
  }
  return false;
}

async function startProductionServer() {
  if (productionServer) return productionServer.url;

  loadRuntimeEnv();
  const appPath = app.getAppPath();
  const { serverEntry, clientRoots } = getProductionPaths(appPath);
  const serverModule = await import(pathToFileURL(serverEntry).href);
  const handler = serverModule.default?.fetch ?? serverModule.default;

  const server = http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url, "http://127.0.0.1");
      const pathname = requestUrl.pathname;

      if (await tryServeClientAssets(req, res, clientRoots)) return;

      // In desktop mode we serve a static SPA shell for route pages to avoid
      // SSR/client hydration mismatches between packaged environments.
      if (!pathname.startsWith("/_serverFn/") && !pathname.startsWith("/api/")) {
        if (await tryServeClientIndex(req, res, clientRoots)) return;
      }

      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks);
      const request = new Request(`${productionServer.url}${req.url}`, {
        method: req.method,
        headers: req.headers,
        body: req.method === "GET" || req.method === "HEAD" ? undefined : body,
        duplex: req.method === "GET" || req.method === "HEAD" ? undefined : "half",
      });
      const response = await handler(request, {}, {});
      res.writeHead(response.status, Object.fromEntries(response.headers));
      if (response.body) {
        res.end(Buffer.from(await response.arrayBuffer()));
      } else {
        res.end();
      }
    } catch (err) {
      console.error("[local-server]", err);
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      res.end(String(err?.stack ?? err));
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  productionServer = {
    server,
    url: `http://127.0.0.1:${address.port}`,
  };
  return productionServer.url;
}

function isAllowedExternalUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: "#0b1220",
    autoHideMenuBar: true,
    title: "PC Diagnostic AI",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
      spellcheck: false,
      // Block remote module + Node integration in any sub-frame
      nodeIntegrationInSubFrames: false,
      nodeIntegrationInWorker: false,
    },
  });

  if (isDev) {
    win.loadURL(process.env.ELECTRON_DEV_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    const appUrl = await startProductionServer();
    win.loadURL(`${appUrl}/app`);
  }

  // External links → default browser (https only)
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternalUrl(url)) shell.openExternal(url);
    return { action: "deny" };
  });

  // Block in-app navigation away from the bundled app or dev server
  win.webContents.on("will-navigate", (event, url) => {
    const allowed =
      url.startsWith("file://") ||
      (!isDev && productionServer?.url && url.startsWith(productionServer.url)) ||
      (isDev && process.env.ELECTRON_DEV_URL && url.startsWith(process.env.ELECTRON_DEV_URL));
    if (!allowed) {
      event.preventDefault();
      if (isAllowedExternalUrl(url)) shell.openExternal(url);
    }
  });

  // Prevent attaching arbitrary webPreferences to new windows
  win.webContents.on("will-attach-webview", (event) => event.preventDefault());
}

// ---- Session-wide hardening -----------------------------------------------

function applySessionHardening(ses) {
  // Inject CSP on every response
  ses.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [isDev ? CSP_DEV : CSP_PROD],
        "X-Content-Type-Options": ["nosniff"],
        "X-Frame-Options": ["DENY"],
        "Referrer-Policy": ["no-referrer"],
      },
    });
  });

  // Deny all permission requests (camera, mic, geolocation, notifications…)
  ses.setPermissionRequestHandler((_wc, _permission, cb) => cb(false));
}

// ---- IPC handlers (secure: only these channels are exposed) -------------

ipcMain.handle("pcd:getSnapshot", async () => {
  try {
    return { ok: true, data: await collectSnapshot() };
  } catch (err) {
    console.error("[pcd:getSnapshot]", err);
    return { ok: false, error: String(err?.message ?? err) };
  }
});

ipcMain.handle("pcd:getStaticInfo", async () => {
  try {
    return { ok: true, data: await getStaticInfo() };
  } catch (err) {
    console.error("[pcd:getStaticInfo]", err);
    return { ok: false, error: String(err?.message ?? err) };
  }
});

ipcMain.handle("pcd:ping", async () => ({ ok: true, data: "pong" }));

// ---- Lifecycle ----------------------------------------------------------

app.whenReady().then(() => {
  applySessionHardening(session.defaultSession);
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (productionServer) {
    productionServer.server.close();
    productionServer = undefined;
  }
  if (process.platform !== "darwin") app.quit();
});
