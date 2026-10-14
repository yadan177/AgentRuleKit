import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "node:path";
import { mkdirSync } from "node:fs";
import { DesktopOperations, STACK_PACKS, inspectProjectRoot } from "./operations.ts";
import type { PlatformChoice, StackChoice } from "./operations.ts";
import { ProjectRegistry } from "./project-registry.ts";
import { PluginLibrary } from "./plugin-library.ts";
import type { PluginInspection } from "./plugin-library.ts";
import { AssetOperations } from "./asset-operations.ts";
import { SoftwareUpdateService } from "./software-update.ts";

const operations = new DesktopOperations();
let window: BrowserWindow | undefined;
let selectedProject: string | undefined;
let activeFileTasks = 0;
let registry: ProjectRegistry;
let pluginLibrary: PluginLibrary;
let pluginInspection: PluginInspection | undefined;
let assetOperations: AssetOperations;
const developmentProfile = !app.isPackaged ? process.env.AGENTRULEKIT_DEV_PROFILE : undefined;
if (developmentProfile) {
  if (!path.isAbsolute(developmentProfile)) throw new Error("开发验证目录必须是绝对路径");
  mkdirSync(developmentProfile, { recursive: true });
  app.setPath("userData", developmentProfile);
}
const softwareUpdate = new SoftwareUpdateService((state) => {
  if (window && !window.isDestroyed()) window.webContents.send("software-update:state", state);
});

function requireProject(): string {
  if (!selectedProject) throw new Error("请先选择项目文件夹");
  return selectedProject;
}

function registerHandlers(): void {
  const guarded = <T extends unknown[]>(channel: string, action: (...args: T) => Promise<unknown>): void => {
    ipcMain.handle(channel, async (event, ...args) => {
      if (!window || event.sender !== window.webContents) throw new Error("请求来源不正确");
      const fileTask = channel.startsWith("rules:") || channel.startsWith("plugins:") || channel.startsWith("assets:");
      if (fileTask) activeFileTasks++;
      try { return await action(...args as T); }
      finally { if (fileTask) activeFileTasks--; }
    });
  };

  guarded("project:choose", async () => {
    const result = await dialog.showOpenDialog(window!, {
      title: "选择项目文件夹",
      defaultPath: selectedProject,
      properties: ["openDirectory"],
    });
    if (result.canceled || !result.filePaths[0]) return undefined;
    const status = await operations.inspect(result.filePaths[0]);
    await registry.add(status.root);
    selectedProject = status.root;
    return status;
  });
  guarded("project:list", async () => Promise.all((await registry.list()).map(async (item) => {
    try { return { ...item, status: await inspectProjectRoot(item.root) }; }
    catch (error) { return { ...item, error: error instanceof Error ? error.message : String(error) }; }
  })));
  guarded("project:select", async (root: string) => {
    if (typeof root !== "string" || !await registry.contains(root)) throw new Error("项目不在工具箱列表中");
    const status = await operations.inspect(root);
    selectedProject = status.root;
    return status;
  });
  guarded("project:forget", async (root: string) => {
    if (typeof root !== "string") throw new Error("项目路径无效");
    if (root === selectedProject) {
      await operations.clearPreview();
    }
    await registry.remove(root);
    if (root === selectedProject) selectedProject = undefined;
  });
  guarded("project:inspect", () => operations.inspect(requireProject()));
  guarded("plugins:list", () => pluginLibrary.list());
  guarded("plugins:inspect", async () => {
    pluginInspection = undefined;
    const result = await dialog.showOpenDialog({ title: "选择插件或独立 Skill 包根目录", buttonLabel: "选择文件夹", properties: ["openDirectory", "noResolveAliases"] });
    if (result.canceled || !result.filePaths[0]) return undefined;
    pluginInspection = await pluginLibrary.inspect(result.filePaths[0]);
    return pluginInspection;
  });
  guarded("plugins:import", async () => {
    if (!pluginInspection) throw new Error("请先检查源插件");
    const result = await pluginLibrary.import(pluginInspection.sourceRoot, pluginInspection.sourceDigest);
    pluginInspection = undefined;
    return result;
  });
  guarded("plugins:export-traework", async (key: string) => {
    if (typeof key !== "string") throw new Error("导入标识无效");
    const result = await dialog.showSaveDialog(window!, { title: "导出 TraeWork 技能包", defaultPath: path.join(app.getPath("downloads"), "toolbox-product-design.zip"), filters: [{ name: "Skill 包", extensions: ["zip"] }] });
    if (result.canceled || !result.filePath) return undefined;
    return pluginLibrary.exportTraeWork(key, result.filePath);
  });
  guarded("assets:list", () => assetOperations.list());
  guarded("assets:preview", (action: "install" | "update" | "uninstall", key: string, ide: "codex" | "traework", id?: string) => assetOperations.preview(action, key, ide, id));
  guarded("assets:apply", (token: string) => assetOperations.apply(token));
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
  guarded("software-update:state", async () => softwareUpdate.getState());
  guarded("software-update:check", () => softwareUpdate.check());
  guarded("software-update:download", () => softwareUpdate.download());
  guarded("software-update:install", async () => {
    if (activeFileTasks > 0) throw new Error("文件操作仍在进行，请完成后再重启更新软件");
    softwareUpdate.install();
  });
  guarded("software-update:open-download", () => softwareUpdate.openDownloadPage());
}

function createWindow(): void {
  window = new BrowserWindow({
    width: 1120,
    height: 930,
    minWidth: 760,
    minHeight: 700,
    show: false,
    title: developmentProfile ? "AI 开发工具箱（开发验证）" : "AI 开发工具箱",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  if (developmentProfile) window.on("page-title-updated", (event) => event.preventDefault());
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  window.once("ready-to-show", () => {
    window?.show();
    void softwareUpdate.check();
  });
  void window.loadFile(path.join(__dirname, "../dist/index.html"));
  window.on("closed", () => { window = undefined; });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!window || window.isDestroyed()) return;
    if (window.isMinimized()) window.restore();
    window.show();
    window.focus();
  });

  app.whenReady().then(() => {
    app.setName("AI 开发工具箱");
    registry = new ProjectRegistry(path.join(app.getPath("userData"), "projects.json"));
    pluginLibrary = new PluginLibrary(path.join(app.getPath("userData"), "plugin-imports"));
    assetOperations = new AssetOperations(pluginLibrary, path.join(app.getPath("userData"), "ide-assets"), developmentProfile ? {
      userHome: path.join(developmentProfile, "user-home"), codexHome: path.join(developmentProfile, "user-home/.codex"),
    } : {});
    registerHandlers();
    createWindow();
    app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });

  app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
}
