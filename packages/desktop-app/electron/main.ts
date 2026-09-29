import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "node:path";
import { DesktopOperations, STACK_PACKS } from "./operations.ts";
import type { PlatformChoice, StackChoice } from "./operations.ts";

const operations = new DesktopOperations();
let window: BrowserWindow | undefined;
let selectedProject: string | undefined;

function requireProject(): string {
  if (!selectedProject) throw new Error("请先选择项目文件夹");
  return selectedProject;
}

function registerHandlers(): void {
  const guarded = <T extends unknown[]>(channel: string, action: (...args: T) => Promise<unknown>): void => {
    ipcMain.handle(channel, async (event, ...args) => {
      if (!window || event.sender !== window.webContents) throw new Error("请求来源不正确");
      return action(...args as T);
    });
  };

  guarded("project:choose", async () => {
    const result = await dialog.showOpenDialog(window!, {
      title: "选择项目文件夹",
      defaultPath: selectedProject,
      properties: ["openDirectory"],
    });
    if (result.canceled || !result.filePaths[0]) return undefined;
    await operations.clearPreview();
    selectedProject = result.filePaths[0];
    return operations.inspect(selectedProject);
  });
  guarded("project:inspect", () => operations.inspect(requireProject()));
  guarded("rules:preview-install", async (stack: string, platforms: string[]) => {
    if (!Object.hasOwn(STACK_PACKS, stack)) throw new Error("技术栈选项无效");
    return operations.previewInstall(requireProject(), stack as StackChoice, platforms as PlatformChoice[]);
  });
  guarded("rules:apply-install", () => operations.applyInstall(requireProject()));
  guarded("rules:check-update", (targets?: PlatformChoice[]) => operations.checkUpdate(requireProject(), targets));
  guarded("rules:preview-update", () => operations.previewUpdate(requireProject()));
  guarded("rules:apply-update", () => operations.applyUpdate(requireProject()));
  guarded("rules:preview-uninstall", () => operations.previewUninstall(requireProject()));
  guarded("rules:apply-uninstall", () => operations.applyUninstall(requireProject()));
  guarded("rules:clear-preview", () => operations.clearPreview());
}

function createWindow(): void {
  window = new BrowserWindow({
    width: 1120,
    height: 930,
    minWidth: 760,
    minHeight: 700,
    show: false,
    title: "AI 开发工具箱",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  window.once("ready-to-show", () => window?.show());
  void window.loadFile(path.join(__dirname, "../dist/index.html"));
  window.on("closed", () => { window = undefined; });
}

app.whenReady().then(() => {
  app.setName("AI 开发工具箱");
  registerHandlers();
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
