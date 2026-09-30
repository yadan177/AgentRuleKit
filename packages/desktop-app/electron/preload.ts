import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("agentRuleKit", {
  chooseProject: () => ipcRenderer.invoke("project:choose"),
  inspectProject: () => ipcRenderer.invoke("project:inspect"),
  previewInstall: (stack: string, platforms: string[]) => ipcRenderer.invoke("rules:preview-install", stack, platforms),
  applyInstall: () => ipcRenderer.invoke("rules:apply-install"),
  checkUpdate: (platforms: string[]) => ipcRenderer.invoke("rules:check-update", platforms),
  previewUpdate: () => ipcRenderer.invoke("rules:preview-update"),
  applyUpdate: () => ipcRenderer.invoke("rules:apply-update"),
  previewUninstall: () => ipcRenderer.invoke("rules:preview-uninstall"),
  applyUninstall: () => ipcRenderer.invoke("rules:apply-uninstall"),
  clearPreview: () => ipcRenderer.invoke("rules:clear-preview"),
  getSoftwareUpdate: () => ipcRenderer.invoke("software-update:state"),
  checkSoftwareUpdate: () => ipcRenderer.invoke("software-update:check"),
  downloadSoftwareUpdate: () => ipcRenderer.invoke("software-update:download"),
  installSoftwareUpdate: () => ipcRenderer.invoke("software-update:install"),
  openSoftwareDownload: () => ipcRenderer.invoke("software-update:open-download"),
  onSoftwareUpdate: (listener: (state: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: unknown) => listener(state);
    ipcRenderer.on("software-update:state", handler);
    return () => ipcRenderer.removeListener("software-update:state", handler);
  },
});
