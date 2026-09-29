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
});
