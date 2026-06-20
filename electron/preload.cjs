// Secure IPC bridge — only the listed channels are exposed to the renderer.
// The renderer has NO direct access to Node, Electron, or systeminformation.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pcDiagnostic", {
  isElectron: true,
  platform: process.platform,
  ping: () => ipcRenderer.invoke("pcd:ping"),
  getSnapshot: () => ipcRenderer.invoke("pcd:getSnapshot"),
  getStaticInfo: () => ipcRenderer.invoke("pcd:getStaticInfo"),
});
