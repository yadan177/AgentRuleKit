import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "node:path";
import { DesktopOperations, STACK_PACKS, inspectProjectRoot } from "./operations.ts";
import type { PlatformChoice, StackChoice } from "./operations.ts";
import { ProjectRegistry } from "./project-registry.ts";
import { SoftwareUpdateService } from "./software-update.ts";

const operations = new DesktopOperations();
let window: BrowserWindow | undefined;
let selectedProject: string | undefined;
let activeRuleTasks = 0;
let registry: ProjectRegistry;
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
      if (channel.startsWith("rules:")) activeRuleTasks++;
      try { return await action(...args as T); }
      finally { if (channel.startsWith("rules:")) activeRuleTasks--; }
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
    if (activeRuleTasks > 0) throw new Error("规则操作仍在进行，请完成后再重启更新软件");
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
  window.once("ready-to-show", () => {
    window?.show();
    void softwareUpdate.check();
  });
  void window.loadFile(path.join(__dirname, "../dist/index.html"));
  window.on("closed", () => { window = undefined; });
}

app.whenReady().then(() => {
  app.setName("AI 开发工具箱");
  registry = new ProjectRegistry(path.join(app.getPath("userData"), "projects.json"));
  registerHandlers();
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
